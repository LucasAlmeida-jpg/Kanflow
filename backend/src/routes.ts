import { Router, type ErrorRequestHandler, type Request, type RequestHandler, type Response } from "express";
import { currentUser, EMAIL, requireAuth } from "./auth.js";
import { db } from "./db.js";
import { apply, HttpError, isMember, text, toError, type OpType } from "./ops.js";
import { broadcast, ownSocket, removeFromBoard } from "./realtime.js";

export const routes = Router();
routes.use(requireAuth);

async function memberOr404(res: Response, boardId: string) {
  if (!(await isMember(db, boardId, currentUser(res).id))) throw new HttpError(404, "board não encontrado");
}

routes.get("/boards", async (_req, res) => {
  const userId = currentUser(res).id;
  const boards = await db.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    include: {
      members: { select: { userId: true, role: true, user: { select: { name: true } } } },
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  res.json(
    boards.map(({ members, activities, ...board }) => ({
      ...board,
      role: members.find((m) => m.userId === userId)?.role,
      owner: members.find((m) => m.role === "owner")?.user.name ?? null,
      memberCount: members.length,
      lastActivityAt: activities[0]?.createdAt ?? board.createdAt,
    })),
  );
});

routes.post("/boards", async (req, res) => {
  const board = await db.board.create({
    data: {
      title: text(req.body?.title, "title"),
      members: { create: { userId: currentUser(res).id, role: "owner" } },
    },
  });
  res.status(201).json({ ...board, role: "owner" });
});

routes.patch("/boards/:id", async (req, res) => {
  const boardId = req.params.id;
  const userId = currentUser(res).id;
  await memberOr404(res, boardId);
  const title = text(req.body?.title, "title");
  const board = await db.$transaction(async (tx) => {
    const before = await tx.board.findUniqueOrThrow({ where: { id: boardId } });
    const updated = await tx.board.update({ where: { id: boardId }, data: { title } });
    await tx.activity.create({
      data: {
        boardId,
        event: "board:updated",
        entityId: boardId,
        actorId: userId,
        before: { title: before.title },
        after: { title: updated.title },
      },
    });
    return updated;
  });
  broadcast(boardId, "board:updated", { id: board.id, title: board.title }, ownSocket(req.get("x-socket-id"), userId));
  res.json(board);
});

routes.delete("/boards/:id", async (req, res) => {
  const boardId = req.params.id;
  const me = await db.membership.findUnique({ where: { boardId_userId: { boardId, userId: currentUser(res).id } } });
  if (!me) throw new HttpError(404, "board não encontrado");
  if (me.role !== "owner") throw new HttpError(403, "só o dono pode apagar o quadro");
  await db.board.delete({ where: { id: boardId } });
  broadcast(boardId, "board:deleted", { id: boardId });
  res.status(204).end();
});

routes.get("/boards/:id", async (req, res) => {
  await memberOr404(res, req.params.id);
  const board = await db.board.findUnique({
    where: { id: req.params.id },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { cards: { orderBy: { position: "asc" } } },
      },
    },
  });
  res.json(board);
});

routes.get("/boards/:id/activity", async (req, res) => {
  await memberOr404(res, req.params.id);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const activity = await db.activity.findMany({
    where: { boardId: req.params.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: { actor: { select: { id: true, name: true } } },
  });
  res.json(activity);
});

routes.get("/boards/:id/members", async (req, res) => {
  await memberOr404(res, req.params.id);
  const members = await db.membership.findMany({
    where: { boardId: req.params.id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json(members.map((m) => ({ ...m.user, role: m.role })));
});

async function ownerOrThrow(res: Response, boardId: string, forbidden: string) {
  const me = await db.membership.findUnique({ where: { boardId_userId: { boardId, userId: currentUser(res).id } } });
  if (!me) throw new HttpError(404, "board não encontrado");
  if (me.role !== "owner") throw new HttpError(403, forbidden);
  return me;
}

const publicInvitation = (i: { id: string; email: string; createdAt: Date }) => ({ id: i.id, email: i.email, createdAt: i.createdAt });

routes.get("/boards/:id/invitations", async (req, res) => {
  await ownerOrThrow(res, req.params.id, "só o dono vê os convites pendentes");
  const invitations = await db.invitation.findMany({ where: { boardId: req.params.id }, orderBy: { createdAt: "asc" } });
  res.json(invitations.map(publicInvitation));
});

routes.post("/boards/:id/invitations", async (req, res) => {
  const boardId = req.params.id;
  const me = await ownerOrThrow(res, boardId, "só o dono pode convidar pessoas");
  const email = text(req.body?.email, "email", 254).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "email inválido");
  if (await db.membership.findFirst({ where: { boardId, user: { email } } })) {
    throw new HttpError(409, "essa pessoa já faz parte deste quadro");
  }
  const invitation = await db.invitation.upsert({
    where: { boardId_email: { boardId, email } },
    create: { boardId, email, invitedById: me.userId },
    update: {},
  });
  res.status(201).json(publicInvitation(invitation));
});

routes.delete("/boards/:id/invitations/:invitationId", async (req, res) => {
  await ownerOrThrow(res, req.params.id, "só o dono pode cancelar convites");
  const { count } = await db.invitation.deleteMany({ where: { id: req.params.invitationId, boardId: req.params.id } });
  if (!count) throw new HttpError(404, "convite não encontrado");
  res.status(204).end();
});

routes.get("/invitations", async (_req, res) => {
  const invitations = await db.invitation.findMany({
    where: { email: currentUser(res).email },
    orderBy: { createdAt: "desc" },
    include: { board: { select: { id: true, title: true } }, invitedBy: { select: { name: true } } },
  });
  res.json(
    invitations.map((i) => ({ id: i.id, createdAt: i.createdAt, board: i.board, invitedBy: i.invitedBy.name })),
  );
});

async function myInvitationOr404(res: Response, id: string) {
  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation || invitation.email !== currentUser(res).email) throw new HttpError(404, "convite não encontrado");
  return invitation;
}

routes.post("/invitations/:id/accept", async (req, res) => {
  const invitation = await myInvitationOr404(res, req.params.id);
  const user = currentUser(res);
  const boardId = invitation.boardId;
  const alreadyMember = await db.membership.findUnique({ where: { boardId_userId: { boardId, userId: user.id } } });
  await db.$transaction([
    ...(alreadyMember
      ? []
      : [
          db.membership.create({ data: { boardId, userId: user.id, role: "member" } }),
          db.activity.create({
            data: { boardId, event: "member:added", entityId: user.id, actorId: user.id, after: { id: user.id, name: user.name } },
          }),
        ]),
    db.invitation.delete({ where: { id: invitation.id } }),
  ]);
  if (!alreadyMember) broadcast(boardId, "member:added", { id: user.id, name: user.name, email: user.email, role: "member" });
  const board = await db.board.findUniqueOrThrow({ where: { id: boardId }, select: { id: true, title: true } });
  res.json(board);
});

routes.post("/invitations/:id/decline", async (req, res) => {
  const invitation = await myInvitationOr404(res, req.params.id);
  await db.invitation.delete({ where: { id: invitation.id } });
  res.status(204).end();
});

routes.delete("/boards/:id/members/:userId", async (req, res) => {
  const boardId = req.params.id;
  const targetId = req.params.userId;
  const myId = currentUser(res).id;
  const me = await db.membership.findUnique({ where: { boardId_userId: { boardId, userId: myId } } });
  if (!me) throw new HttpError(404, "board não encontrado");
  const leaving = targetId === myId;
  if (leaving && me.role === "owner") throw new HttpError(400, "o dono não pode sair do quadro; apague o quadro ou continue como dono");
  if (!leaving && me.role !== "owner") throw new HttpError(403, "só o dono pode remover membros");

  const target = await db.membership.findUnique({
    where: { boardId_userId: { boardId, userId: targetId } },
    include: { user: { select: { name: true } } },
  });
  if (!target) throw new HttpError(404, "membro não encontrado");
  if (target.role === "owner") throw new HttpError(400, "o dono não pode ser removido");

  await db.$transaction([
    db.membership.delete({ where: { boardId_userId: { boardId, userId: targetId } } }),
    db.activity.create({
      data: { boardId, event: "member:removed", entityId: targetId, actorId: myId, before: { id: targetId, name: target.user.name } },
    }),
  ]);
  broadcast(boardId, "member:removed", { id: targetId });
  removeFromBoard(boardId, targetId);
  res.status(204).end();
});

function run(op: OpType, input: (req: Request) => Record<string, unknown>, status = 200): RequestHandler {
  return async (req, res) => {
    const userId = currentUser(res).id;
    const change = await apply(op, input(req), userId);
    broadcast(change.boardId, change.event, change.data, ownSocket(req.get("x-socket-id"), userId));
    if (status === 204) res.status(204).end();
    else res.status(status).json(change.result);
  };
}

routes.post("/boards/:id/columns", run("createColumn", (req) => ({ ...req.body, boardId: req.params.id }), 201));
routes.post("/columns/:id/cards", run("createCard", (req) => ({ ...req.body, columnId: req.params.id }), 201));
routes.patch("/cards/:id", run("updateCard", (req) => ({ ...req.body, id: req.params.id })));
routes.post("/cards/:id/move", run("moveCard", (req) => ({ ...req.body, id: req.params.id })));
routes.delete("/cards/:id", run("deleteCard", (req) => ({ id: req.params.id }), 204));
routes.delete("/columns/:id", run("deleteColumn", (req) => ({ id: req.params.id }), 204));

export const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, ...body } = toError(err);
  res.status(status).json(body);
};
