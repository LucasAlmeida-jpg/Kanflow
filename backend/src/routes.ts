import { Router, type ErrorRequestHandler, type Request, type RequestHandler, type Response } from "express";
import { currentUser, requireAuth } from "./auth.js";
import { db } from "./db.js";
import { apply, HttpError, isMember, text, toError, type OpType } from "./ops.js";
import { broadcast, ownSocket } from "./realtime.js";

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
    include: { members: { where: { userId }, select: { role: true } } },
  });
  res.json(boards.map(({ members, ...board }) => ({ ...board, role: members[0]?.role })));
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

routes.post("/boards/:id/members", async (req, res) => {
  const boardId = req.params.id;
  const me = await db.membership.findUnique({ where: { boardId_userId: { boardId, userId: currentUser(res).id } } });
  if (!me) throw new HttpError(404, "board não encontrado");
  if (me.role !== "owner") throw new HttpError(403, "só o dono pode adicionar membros");

  const user = await db.user.findUnique({ where: { email: text(req.body?.email, "email").toLowerCase() } });
  if (!user) throw new HttpError(404, "usuário não encontrado");
  await db.membership.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    create: { boardId, userId: user.id, role: "member" },
    update: {},
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: "member" });
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
