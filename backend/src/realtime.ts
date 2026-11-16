import { Server } from "socket.io";
import { db } from "./db.js";
import { apply, isOpType, toError, type ErrorBody } from "./ops.js";

export const io = new Server({ cors: { origin: "*" } });

const room = (boardId: string) => `board:${boardId}`;

type OpResult = { opId: string; ok: true; result: unknown } | ({ opId: string; ok: false } & ErrorBody);

const recentOps = new Map<string, Promise<OpResult>>();
const MAX_RECENT_OPS = 1000;

async function execute(opId: string, type: unknown, payload: unknown, socketId: string): Promise<OpResult> {
  if (!isOpType(type)) return { opId, ok: false, status: 400, error: "op desconhecida" };
  try {
    const change = await apply(type, (payload ?? {}) as Record<string, unknown>);
    broadcast(change.boardId, change.event, change.data, socketId);
    return { opId, ok: true, result: change.result };
  } catch (err) {
    recentOps.delete(opId);
    return { opId, ok: false, ...toError(err) };
  }
}

io.on("connection", (socket) => {
  socket.on("board:join", async (boardId: unknown, ack?: (res: object) => void) => {
    const board = typeof boardId === "string" ? await db.board.findUnique({ where: { id: boardId } }) : null;
    if (!board) return ack?.({ error: "board não encontrado" });
    await socket.join(room(board.id));
    ack?.({ ok: true });
  });

  socket.on("board:leave", async (boardId: unknown) => {
    if (typeof boardId === "string") await socket.leave(room(boardId));
  });

  socket.on("op", async (msg: any, ack?: (res: OpResult) => void) => {
    if (typeof ack !== "function") return;
    const opId = msg?.opId;
    if (typeof opId !== "string" || !opId) return ack({ opId: "", ok: false, status: 400, error: "opId é obrigatório" });

    let pending = recentOps.get(opId);
    if (!pending) {
      pending = execute(opId, msg.type, msg.payload, socket.id);
      recentOps.set(opId, pending);
      if (recentOps.size > MAX_RECENT_OPS) recentOps.delete(recentOps.keys().next().value!);
    }
    ack(await pending);
  });
});

export function broadcast(boardId: string, event: string, data: unknown, exceptSocketId?: string) {
  const target = io.to(room(boardId));
  (exceptSocketId ? target.except(exceptSocketId) : target).emit(event, data);
}
