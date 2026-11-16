import { Server } from "socket.io";
import { userFromToken } from "./auth.js";
import { db } from "./db.js";
import { apply, isMember, isOpType, toError, type ErrorBody } from "./ops.js";

export const io = new Server({ cors: { origin: "*" } });

const room = (boardId: string) => `board:${boardId}`;

type OpResult = { opId: string; ok: true; result: unknown } | ({ opId: string; ok: false } & ErrorBody);

const recentOps = new Map<string, Promise<OpResult>>();
const MAX_RECENT_OPS = 1000;

async function execute(key: string, opId: string, type: unknown, payload: unknown, socketId: string, userId: string): Promise<OpResult> {
  if (!isOpType(type)) return { opId, ok: false, status: 400, error: "op desconhecida" };
  try {
    const change = await apply(type, (payload ?? {}) as Record<string, unknown>, userId);
    broadcast(change.boardId, change.event, change.data, socketId);
    return { opId, ok: true, result: change.result };
  } catch (err) {
    recentOps.delete(key);
    return { opId, ok: false, ...toError(err) };
  }
}

io.use(async (socket, next) => {
  const user = await userFromToken(socket.handshake.auth?.token);
  if (!user) return next(new Error("não autenticado"));
  socket.data.user = user;
  next();
});

io.on("connection", (socket) => {
  const userId: string = socket.data.user.id;

  socket.on("board:join", async (boardId: unknown, ack?: (res: object) => void) => {
    if (typeof boardId !== "string" || !(await isMember(db, boardId, userId))) {
      return ack?.({ error: "board não encontrado" });
    }
    await socket.join(room(boardId));
    ack?.({ ok: true });
  });

  socket.on("board:leave", async (boardId: unknown) => {
    if (typeof boardId === "string") await socket.leave(room(boardId));
  });

  socket.on("op", async (msg: any, ack?: (res: OpResult) => void) => {
    if (typeof ack !== "function") return;
    const opId = msg?.opId;
    if (typeof opId !== "string" || !opId) return ack({ opId: "", ok: false, status: 400, error: "opId é obrigatório" });

    const key = `${userId}:${opId}`;
    let pending = recentOps.get(key);
    if (!pending) {
      pending = execute(key, opId, msg.type, msg.payload, socket.id, userId);
      recentOps.set(key, pending);
      if (recentOps.size > MAX_RECENT_OPS) recentOps.delete(recentOps.keys().next().value!);
    }
    ack(await pending);
  });
});

export function ownSocket(socketId: string | undefined, userId: string) {
  if (!socketId) return undefined;
  return io.sockets.sockets.get(socketId)?.data.user?.id === userId ? socketId : undefined;
}

export function broadcast(boardId: string, event: string, data: unknown, exceptSocketId?: string) {
  const target = io.to(room(boardId));
  (exceptSocketId ? target.except(exceptSocketId) : target).emit(event, data);
}
