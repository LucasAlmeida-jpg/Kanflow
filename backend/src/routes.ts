import { Router, type ErrorRequestHandler, type Request } from "express";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "./db.js";
import { broadcast } from "./realtime.js";

export const routes = Router();

function text(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${field} é obrigatório`);
  return v.trim();
}

function emit(req: Request, boardId: string, event: string, data: unknown) {
  broadcast(boardId, event, data, req.get("x-socket-id"));
}

async function columnOr404(id: string) {
  const column = await db.column.findUnique({ where: { id } });
  if (!column) throw new HttpError(404, "coluna não encontrada");
  return column;
}

const withBoard = { column: { select: { boardId: true } } } as const;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

routes.post("/boards/:id/columns", async (req, res) => {
  const title = text(req.body?.title, "title");
  const last = await db.column.findFirst({
    where: { boardId: req.params.id },
    orderBy: { position: "desc" },
  });
  const column = await db.column.create({
    data: { title, boardId: req.params.id, position: generateKeyBetween(last?.position ?? null, null) },
  });
  emit(req, column.boardId, "column:created", column);
  res.status(201).json(column);
});

routes.post("/columns/:id/cards", async (req, res) => {
  const title = text(req.body?.title, "title");
  const column = await columnOr404(req.params.id);
  const last = await db.card.findFirst({
    where: { columnId: req.params.id },
    orderBy: { position: "desc" },
  });
  const card = await db.card.create({
    data: {
      title,
      description: typeof req.body?.description === "string" ? req.body.description : "",
      columnId: req.params.id,
      position: generateKeyBetween(last?.position ?? null, null),
    },
  });
  emit(req, column.boardId, "card:created", card);
  res.status(201).json(card);
});

routes.patch("/cards/:id", async (req, res) => {
  const data: { title?: string; description?: string } = {};
  if (req.body?.title !== undefined) data.title = text(req.body.title, "title");
  if (typeof req.body?.description === "string") data.description = req.body.description;
  const { column, ...card } = await db.card.update({
    where: { id: req.params.id },
    data: { ...data, version: { increment: 1 } },
    include: withBoard,
  });
  emit(req, column.boardId, "card:updated", card);
  res.json(card);
});

routes.post("/cards/:id/move", async (req, res) => {
  const id = req.params.id;
  const columnId = text(req.body?.columnId, "columnId");
  const { beforeId, afterId } = req.body ?? {};
  if (beforeId === id || afterId === id) throw new HttpError(400, "card não pode ser vizinho de si mesmo");

  const target = await columnOr404(columnId);
  const current = await db.card.findUnique({ where: { id }, include: withBoard });
  if (!current) throw new HttpError(404, "card não encontrado");
  if (current.column.boardId !== target.boardId) throw new HttpError(400, "coluna de outro quadro");

  async function neighbor(nid: unknown): Promise<string | null> {
    if (nid == null) return null;
    const card = await db.card.findUnique({ where: { id: String(nid) } });
    if (!card || card.columnId !== columnId) throw new HttpError(400, "vizinho inválido para essa coluna");
    return card.position;
  }

  let before = await neighbor(beforeId);
  const after = await neighbor(afterId);
  if (before === null && after === null) {
    const last = await db.card.findFirst({
      where: { columnId, id: { not: id } },
      orderBy: { position: "desc" },
    });
    before = last?.position ?? null;
  }

  if (before !== null && after !== null && before >= after) {
    throw new HttpError(400, "beforeId precisa estar acima de afterId");
  }
  const position = generateKeyBetween(before, after);

  const card = await db.card.update({
    where: { id },
    data: { columnId, position, version: { increment: 1 } },
  });
  emit(req, target.boardId, "card:moved", card);
  res.json(card);
});

routes.delete("/cards/:id", async (req, res) => {
  const { column, ...card } = await db.card.delete({ where: { id: req.params.id }, include: withBoard });
  emit(req, column.boardId, "card:deleted", { id: card.id, columnId: card.columnId });
  res.status(204).end();
});

export const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.code === "P2025" || err?.code === "P2003") return res.status(404).json({ error: "não encontrado" });
  console.error(err);
  res.status(500).json({ error: "erro interno" });
};
