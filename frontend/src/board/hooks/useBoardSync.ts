import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { boardsApi, type Member } from "../../api";
import { connectSocket, joinBoard, type BoardSocket } from "../../api/socket";
import { boardReducer, type BoardState } from "../boardReducer";

export type ConnectionStatus = "connecting" | "online" | "offline";

const message = (err: unknown) => (err instanceof Error ? err.message : "erro inesperado");

export function useBoardSync(boardId: string, currentUserId?: string) {
  const [board, dispatch] = useReducer(boardReducer, null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<BoardSocket | null>(null);
  const boardRef = useRef<BoardState>(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const reload = useCallback(async () => {
    try {
      const [fresh, people] = await Promise.all([boardsApi.get(boardId), boardsApi.members(boardId)]);
      dispatch({ type: "load", board: fresh });
      setMembers(people);
    } catch (err) {
      setError(message(err));
    }
  }, [boardId]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;
    let alive = true;
    let connectedBefore = false;

    Promise.all([boardsApi.get(boardId), boardsApi.members(boardId)])
      .then(([fresh, people]) => {
        if (!alive) return;
        dispatch({ type: "load", board: fresh });
        setMembers(people);
      })
      .catch((err) => alive && setError(message(err)));

    socket.on("connect", async () => {
      try {
        await joinBoard(socket, boardId);
        if (!alive) return;
        setStatus("online");
        if (connectedBefore) await reload();
        connectedBefore = true;
      } catch (err) {
        if (alive) setError(message(err));
      }
    });
    socket.on("disconnect", () => alive && setStatus("offline"));
    socket.on("connect_error", (err) => {
      if (!alive) return;
      setStatus("offline");
      if (err.message === "não autenticado") setError("Sua sessão expirou. Entre de novo.");
    });
    socket.on("board:updated", ({ title }) => dispatch({ type: "boardUpdate", title }));
    socket.on("board:deleted", () => alive && setError("Este quadro foi apagado pelo dono."));
    socket.on("member:added", (member) => setMembers((list) => (list.some((m) => m.id === member.id) ? list : [...list, member])));
    socket.on("member:removed", ({ id }) => {
      if (!alive) return;
      if (id === currentUserId) {
        setError("Você não faz mais parte deste quadro.");
        socket.disconnect();
        return;
      }
      setMembers((list) => list.filter((m) => m.id !== id));
    });
    socket.on("column:created", (column) => dispatch({ type: "columnUpsert", column }));
    socket.on("column:deleted", ({ id }) => dispatch({ type: "columnRemove", id }));
    socket.on("card:created", (card) => dispatch({ type: "cardUpsert", card }));
    socket.on("card:updated", (card) => dispatch({ type: "cardUpsert", card }));
    socket.on("card:moved", (card) => dispatch({ type: "cardUpsert", card }));
    socket.on("card:deleted", ({ id }) => dispatch({ type: "cardRemove", id }));

    return () => {
      alive = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, currentUserId, reload]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  return { board, dispatch, boardRef, socketRef, members, setMembers, error, status, notice, setNotice, reload };
}
