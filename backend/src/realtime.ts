import { Server } from "socket.io";
import { db } from "./db.js";

export const io = new Server({ cors: { origin: "*" } });

const room = (boardId: string) => `board:${boardId}`;

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
});

export function broadcast(boardId: string, event: string, data: unknown, exceptSocketId?: string) {
  const target = io.to(room(boardId));
  (exceptSocketId ? target.except(exceptSocketId) : target).emit(event, data);
}
