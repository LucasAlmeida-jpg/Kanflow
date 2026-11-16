import { generateKeyBetween } from "fractional-indexing";
import { db } from "./db.js";
import { Prisma } from "./generated/prisma/client.js";

export class HttpError extends Error {
  constructor(public status: number, message: string, public current?: unknown) {
    super(message);
  }
}

export type ErrorBody = { status: number; error: string; current?: unknown };

export function toError(err: any): ErrorBody {
  if (err instanceof HttpError) {
    return { status: err.status, error: err.message, ...(err.current !== undefined && { current: err.current }) };
  }
  if (err?.code === "P2025" || err?.code === "P2003") return { status: 404, error: "não encontrado" };
  console.error(err);
  return { status: 500, error: "erro interno" };
}

export function text(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${field} é obrigatório`);
  return v.trim();
}

type Tx = Prisma.TransactionClient;
type Input = Record<string, unknown>;
export type Change = {
  boardId: string;
  event: string;
  entityId: string;
  before: unknown;
  data: unknown;
  result: unknown;
};

const withBoard = { column: { select: { boardId: true } } } as const;

export async function isMember(tx: Tx, boardId: string, userId: string) {
  return !!(await tx.membership.findUnique({ where: { boardId_userId: { boardId, userId } } }));
}

async function boardOr404(tx: Tx, boardId: string, userId: string) {
  if (!(await isMember(tx, boardId, userId))) throw new HttpError(404, "board não encontrado");
}

async function columnOr404(tx: Tx, id: string, userId: string) {
  const column = await tx.column.findUnique({ where: { id } });
  if (!column || !(await isMember(tx, column.boardId, userId))) throw new HttpError(404, "coluna não encontrada");
  return column;
}

async function cardOr404(tx: Tx, id: string, userId: string) {
  const found = await tx.card.findUnique({ where: { id }, include: withBoard });
  if (!found || !(await isMember(tx, found.column.boardId, userId))) throw new HttpError(404, "card não encontrado");
  const { column, ...card } = found;
  return { card, boardId: column.boardId };
}

function checkVersion(p: Input, current: { version: number }) {
  if (p.version === undefined) return;
  if (!Number.isInteger(p.version)) throw new HttpError(400, "version precisa ser um inteiro");
  if (p.version !== current.version) throw new HttpError(409, "card foi alterado por outra pessoa", current);
}

async function lastPosition(tx: Tx, where: { boardId: string } | { columnId: string }, exceptId?: string) {
  const query = { where: { ...where, ...(exceptId && { id: { not: exceptId } }) }, orderBy: { position: "desc" as const } };
  const last = "boardId" in where ? await tx.column.findFirst(query) : await tx.card.findFirst(query);
  return last?.position ?? null;
}

export const ops = {
  async createColumn(tx: Tx, p: Input, userId: string): Promise<Change> {
    const title = text(p.title, "title");
    const boardId = text(p.boardId, "boardId");
    await boardOr404(tx, boardId, userId);
    const column = await tx.column.create({
      data: { title, boardId, position: generateKeyBetween(await lastPosition(tx, { boardId }), null) },
    });
    return { boardId, event: "column:created", entityId: column.id, before: null, data: column, result: column };
  },

  async createCard(tx: Tx, p: Input, userId: string): Promise<Change> {
    const title = text(p.title, "title");
    const column = await columnOr404(tx, text(p.columnId, "columnId"), userId);
    const card = await tx.card.create({
      data: {
        title,
        description: typeof p.description === "string" ? p.description : "",
        columnId: column.id,
        position: generateKeyBetween(await lastPosition(tx, { columnId: column.id }), null),
      },
    });
    return { boardId: column.boardId, event: "card:created", entityId: card.id, before: null, data: card, result: card };
  },

  async updateCard(tx: Tx, p: Input, userId: string): Promise<Change> {
    const { card: before, boardId } = await cardOr404(tx, text(p.id, "id"), userId);
    checkVersion(p, before);
    const data: { title?: string; description?: string } = {};
    if (p.title !== undefined) data.title = text(p.title, "title");
    if (typeof p.description === "string") data.description = p.description;
    const card = await tx.card.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } } });
    return { boardId, event: "card:updated", entityId: card.id, before, data: card, result: card };
  },

  async moveCard(tx: Tx, p: Input, userId: string): Promise<Change> {
    const id = text(p.id, "id");
    const columnId = text(p.columnId, "columnId");
    const { beforeId, afterId } = p;
    if (beforeId === id || afterId === id) throw new HttpError(400, "card não pode ser vizinho de si mesmo");

    const target = await columnOr404(tx, columnId, userId);
    const { card: before, boardId } = await cardOr404(tx, id, userId);
    if (boardId !== target.boardId) throw new HttpError(400, "coluna de outro quadro");
    checkVersion(p, before);

    async function neighbor(nid: unknown): Promise<string | null> {
      if (nid == null) return null;
      const card = await tx.card.findUnique({ where: { id: String(nid) } });
      if (!card || card.columnId !== columnId) throw new HttpError(400, "vizinho inválido para essa coluna");
      return card.position;
    }

    let prev = await neighbor(beforeId);
    const next = await neighbor(afterId);
    if (prev === null && next === null) prev = await lastPosition(tx, { columnId }, id);
    if (prev !== null && next !== null && prev >= next) {
      throw new HttpError(400, "beforeId precisa estar acima de afterId");
    }

    const card = await tx.card.update({
      where: { id },
      data: { columnId, position: generateKeyBetween(prev, next), version: { increment: 1 } },
    });
    return { boardId, event: "card:moved", entityId: id, before, data: card, result: card };
  },

  async deleteCard(tx: Tx, p: Input, userId: string): Promise<Change> {
    const { card: before, boardId } = await cardOr404(tx, text(p.id, "id"), userId);
    checkVersion(p, before);
    await tx.card.delete({ where: { id: before.id } });
    const data = { id: before.id, columnId: before.columnId };
    return { boardId, event: "card:deleted", entityId: before.id, before, data, result: data };
  },
};

export type OpType = keyof typeof ops;
export const isOpType = (t: unknown): t is OpType => typeof t === "string" && Object.hasOwn(ops, t);

const json = (v: unknown) => (v == null ? Prisma.DbNull : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

export function apply(type: OpType, p: Input, userId: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const change = await ops[type](tx, p, userId);
    await tx.activity.create({
      data: {
        boardId: change.boardId,
        event: change.event,
        entityId: change.entityId,
        actorId: userId,
        before: json(change.before),
        after: change.event === "card:deleted" ? Prisma.DbNull : json(change.data),
      },
    });
    return change;
  });
}
