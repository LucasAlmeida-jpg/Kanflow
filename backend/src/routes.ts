import { Router, type ErrorRequestHandler, type Request, type RequestHandler } from "express";
import { db } from "./db.js";
import { apply, HttpError, text, toError, type OpType } from "./ops.js";
import { broadcast } from "./realtime.js";

export const routes = Router();

routes.get("/boards", async (_req, res) => {
  res.json(await db.board.findMany({ orderBy: { createdAt: "asc" } }));
});

routes.post("/boards", async (req, res) => {
  const board = await db.board.create({ data: { title: text(req.body?.title, "title") } });
  res.status(201).json(board);
});

routes.get("/boards/:id", async (req, res) => {
  const board = await db.board.findUnique({
    where: { id: req.params.id },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { cards: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!board) throw new HttpError(404, "board não encontrado");
  res.json(board);
});

routes.get("/boards/:id/activity", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const activity = await db.activity.findMany({
    where: { boardId: req.params.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  res.json(activity);
});

function run(op: OpType, input: (req: Request) => Record<string, unknown>, status = 200): RequestHandler {
  return async (req, res) => {
    const change = await apply(op, input(req));
    broadcast(change.boardId, change.event, change.data, req.get("x-socket-id"));
    if (status === 204) res.status(204).end();
    else res.status(status).json(change.result);
  };
}

routes.post("/boards/:id/columns", run("createColumn", (req) => ({ ...req.body, boardId: req.params.id }), 201));
routes.post("/columns/:id/cards", run("createCard", (req) => ({ ...req.body, columnId: req.params.id }), 201));
routes.patch("/cards/:id", run("updateCard", (req) => ({ ...req.body, id: req.params.id })));
routes.post("/cards/:id/move", run("moveCard", (req) => ({ ...req.body, id: req.params.id })));
routes.delete("/cards/:id", run("deleteCard", (req) => ({ id: req.params.id }), 204));

export const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, ...body } = toError(err);
  res.status(status).json(body);
};
