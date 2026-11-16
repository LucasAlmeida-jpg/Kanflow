import { generateKeyBetween } from "fractional-indexing";
import { db } from "./db.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function toError(err: any): { status: number; error: string } {
  if (err instanceof HttpError) return { status: err.status, error: err.message };
  if (err?.code === "P2025" || err?.code === "P2003") return { status: 404, error: "não encontrado" };
  console.error(err);
  return { status: 500, error: "erro interno" };
}

export function text(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${field} é obrigatório`);
  return v.trim();
}

type Input = Record<string, unknown>;
export type Change = { boardId: string; event: string; data: unknown; result: unknown };

async function columnOr404(id: string) {
  const column = await db.column.findUnique({ where: { id } });
  if (!column) throw new HttpError(404, "coluna não encontrada");
  return column;
}

async function lastPosition(where: { boardId: string } | { columnId: string }, exceptId?: string) {
  const query = { where: { ...where, ...(exceptId && { id: { not: exceptId } }) }, orderBy: { position: "desc" as const } };
  const last = "boardId" in where ? await db.column.findFirst(query) : await db.card.findFirst(query);
  return last?.position ?? null;
}

const withBoard = { column: { select: { boardId: true } } } as const;

export const ops = {
  async createColumn(p: Input): Promise<Change> {
    const title = text(p.title, "title");
    const boardId = text(p.boardId, "boardId");
    const column = await db.column.create({
      data: { title, boardId, position: generateKeyBetween(await lastPosition({ boardId }), null) },
    });
    return { boardId, event: "column:created", data: column, result: column };
  },

  async createCard(p: Input): Promise<Change> {
    const title = text(p.title, "title");
    const column = await columnOr404(text(p.columnId, "columnId"));
    const card = await db.card.create({
      data: {
        title,
        description: typeof p.description === "string" ? p.description : "",
        columnId: column.id,
        position: generateKeyBetween(await lastPosition({ columnId: column.id }), null),
      },
    });
    return { boardId: column.boardId, event: "card:created", data: card, result: card };
  },

  async updateCard(p: Input): Promise<Change> {
    const data: { title?: string; description?: string } = {};
    if (p.title !== undefined) data.title = text(p.title, "title");
    if (typeof p.description === "string") data.description = p.description;
    const { column, ...card } = await db.card.update({
      where: { id: text(p.id, "id") },
      data: { ...data, version: { increment: 1 } },
      include: withBoard,
    });
    return { boardId: column.boardId, event: "card:updated", data: card, result: card };
  },

  async moveCard(p: Input): Promise<Change> {
    const id = text(p.id, "id");
    const columnId = text(p.columnId, "columnId");
    const { beforeId, afterId } = p;
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
    if (before === null && after === null) before = await lastPosition({ columnId }, id);
    if (before !== null && after !== null && before >= after) {
      throw new HttpError(400, "beforeId precisa estar acima de afterId");
    }

    const card = await db.card.update({
      where: { id },
      data: { columnId, position: generateKeyBetween(before, after), version: { increment: 1 } },
    });
    return { boardId: target.boardId, event: "card:moved", data: card, result: card };
  },

  async deleteCard(p: Input): Promise<Change> {
    const { column, ...card } = await db.card.delete({ where: { id: text(p.id, "id") }, include: withBoard });
    const data = { id: card.id, columnId: card.columnId };
    return { boardId: column.boardId, event: "card:deleted", data, result: data };
  },
};

export type OpType = keyof typeof ops;
export const isOpType = (t: unknown): t is OpType => typeof t === "string" && Object.hasOwn(ops, t);
