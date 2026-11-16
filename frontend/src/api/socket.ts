import { io, type Socket } from "socket.io-client";
import { getToken } from "./client";
import type { Card, Column } from "./types";

export type OpType = "createColumn" | "createCard" | "updateCard" | "moveCard" | "deleteCard";

export type OpResult<T = unknown> =
  | { opId: string; ok: true; result: T }
  | { opId: string; ok: false; status: number; error: string; current?: unknown };

export type ServerEvents = {
  "column:created": (column: Column) => void;
  "card:created": (card: Card) => void;
  "card:updated": (card: Card) => void;
  "card:moved": (card: Card) => void;
  "card:deleted": (data: { id: string; columnId: string }) => void;
};

type JoinResult = { ok?: true; error?: string };

type ClientEvents = {
  op: (msg: { opId: string; type: OpType; payload: object }, ack: (res: OpResult) => void) => void;
  "board:join": (boardId: string, ack: (res: JoinResult) => void) => void;
  "board:leave": (boardId: string) => void;
};

export type BoardSocket = Socket<ServerEvents, ClientEvents>;

const OP_TIMEOUT_MS = 10_000;

export function connectSocket(): BoardSocket {
  return io({ auth: (cb) => cb({ token: getToken() }), transports: ["websocket"] });
}

export async function sendOp<T>(socket: BoardSocket, type: OpType, payload: object, opId = crypto.randomUUID()) {
  try {
    return (await socket.timeout(OP_TIMEOUT_MS).emitWithAck("op", { opId, type, payload })) as OpResult<T>;
  } catch {
    return { opId, ok: false, status: 0, error: "sem resposta do servidor" } satisfies OpResult<T>;
  }
}

export async function joinBoard(socket: BoardSocket, boardId: string) {
  const res = await socket.timeout(OP_TIMEOUT_MS).emitWithAck("board:join", boardId);
  if (!res.ok) throw new Error(res.error ?? "não foi possível entrar no quadro");
}
