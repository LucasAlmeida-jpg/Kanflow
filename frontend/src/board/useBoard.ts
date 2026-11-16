import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { boardsApi, type Card, type Column, type ColumnWithCards } from "../api";
import { connectSocket, joinBoard, sendOp, type BoardSocket, type OpType } from "../api/socket";
import { boardReducer, findCard, type BoardState } from "./boardReducer";

export type ConnectionStatus = "connecting" | "online" | "offline";

export type DragSnapshot = { card: Card; columnId: string; index: number };

const TEMP_PREFIX = "temp-";
export const isTemp = (id: string) => id.startsWith(TEMP_PREFIX);
const tempId = () => `${TEMP_PREFIX}${crypto.randomUUID()}`;

function lastPosition(items: { id: string; position: string }[]) {
  return items.length ? items[items.length - 1]!.position : null;
}

function neighbors(cards: Card[], index: number) {
  let before: Card | undefined;
  let after: Card | undefined;
  for (let i = index - 1; i >= 0 && !before; i--) if (!isTemp(cards[i]!.id)) before = cards[i];
  for (let i = index + 1; i < cards.length && !after; i++) if (!isTemp(cards[i]!.id)) after = cards[i];
  return { before, after };
}

export function useBoard(boardId: string) {
  const [board, dispatch] = useReducer(boardReducer, null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<BoardSocket | null>(null);

  const reload = useCallback(async () => {
    try {
      dispatch({ type: "load", board: await boardsApi.get(boardId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro inesperado");
    }
  }, [boardId]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;
    let alive = true;
    let connectedBefore = false;

    boardsApi
      .get(boardId)
      .then((fresh) => alive && dispatch({ type: "load", board: fresh }))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "erro inesperado"));

    socket.on("connect", async () => {
      try {
        await joinBoard(socket, boardId);
        if (!alive) return;
        setStatus("online");
        if (connectedBefore) await reload();
        connectedBefore = true;
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "erro inesperado");
      }
    });
    socket.on("disconnect", () => alive && setStatus("offline"));
    socket.on("connect_error", (err) => {
      if (!alive) return;
      setStatus("offline");
      if (err.message === "não autenticado") setError("Sua sessão expirou. Entre de novo.");
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
  }, [boardId, reload]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const run = useCallback(
    async <T>(type: OpType, payload: object, rollback: () => void, onOk: (result: T) => void) => {
      const socket = socketRef.current;
      const res = socket?.connected
        ? await sendOp<T>(socket, type, payload)
        : ({ ok: false, status: 0, error: "sem conexão com o servidor" } as const);
      if (res.ok) return onOk(res.result);

      rollback();
      if (res.status === 409 && res.current) {
        dispatch({ type: "cardUpsert", card: res.current as Card, force: true });
        setNotice("Esse card foi alterado por outra pessoa. Mostrando a versão mais recente.");
        return;
      }
      setNotice(`Não foi possível salvar: ${res.error}.`);
      if (res.status === 0 || res.status === 404) void reload();
    },
    [reload],
  );

  const createColumn = useCallback(
    (title: string) => {
      if (!board) return;
      const temp: Column = { id: tempId(), title, boardId, position: generateKeyBetween(lastPosition(board.columns), null) };
      dispatch({ type: "columnUpsert", column: temp });
      void run<Column>(
        "createColumn",
        { boardId, title },
        () => dispatch({ type: "columnRemove", id: temp.id }),
        (column) => {
          dispatch({ type: "columnRemove", id: temp.id });
          dispatch({ type: "columnUpsert", column });
        },
      );
    },
    [board, boardId, run],
  );

  const deleteColumn = useCallback(
    (column: ColumnWithCards) => {
      if (isTemp(column.id)) return;
      dispatch({ type: "columnRemove", id: column.id });
      void run(
        "deleteColumn",
        { id: column.id },
        () => dispatch({ type: "columnUpsert", column }),
        () => undefined,
      );
    },
    [run],
  );

  const createCard = useCallback(
    (columnId: string, title: string) => {
      const column = board?.columns.find((c) => c.id === columnId);
      if (!column || isTemp(columnId)) return;
      const temp: Card = {
        id: tempId(),
        title,
        description: "",
        columnId,
        version: 1,
        updatedAt: new Date().toISOString(),
        position: generateKeyBetween(lastPosition(column.cards), null),
      };
      dispatch({ type: "cardUpsert", card: temp });
      void run<Card>(
        "createCard",
        { columnId, title },
        () => dispatch({ type: "cardRemove", id: temp.id }),
        (card) => {
          dispatch({ type: "cardRemove", id: temp.id });
          dispatch({ type: "cardUpsert", card });
        },
      );
    },
    [board, run],
  );

  const previewMove = useCallback((id: string, columnId: string, index: number) => {
    dispatch({ type: "cardPreview", id, columnId, index });
  }, []);

  const restore = useCallback((snapshot: DragSnapshot) => {
    dispatch({ type: "cardUpsert", card: snapshot.card, force: true });
  }, []);

  const commitMove = useCallback(
    (state: BoardState, snapshot: DragSnapshot) => {
      const { card } = snapshot;
      const at = findCard(state, card.id);
      if (!at || (at.column.id === snapshot.columnId && at.index === snapshot.index)) return restore(snapshot);

      const { before, after } = neighbors(at.column.cards, at.index);
      let position: string;
      try {
        position = generateKeyBetween(before?.position ?? null, after?.position ?? null);
      } catch {
        return restore(snapshot);
      }

      dispatch({ type: "cardUpsert", card: { ...card, columnId: at.column.id, position, version: card.version + 1 }, force: true });
      void run<Card>(
        "moveCard",
        { id: card.id, columnId: at.column.id, beforeId: before?.id, afterId: after?.id, version: card.version },
        () => restore(snapshot),
        (result) => dispatch({ type: "cardUpsert", card: result, force: true }),
      );
    },
    [restore, run],
  );

  const deleteCard = useCallback(
    (card: Card) => {
      if (isTemp(card.id)) return;
      dispatch({ type: "cardRemove", id: card.id });
      void run(
        "deleteCard",
        { id: card.id, version: card.version },
        () => dispatch({ type: "cardUpsert", card, force: true }),
        () => undefined,
      );
    },
    [run],
  );

  return {
    board,
    error,
    status,
    notice,
    dismissNotice: () => setNotice(null),
    createColumn,
    deleteColumn,
    createCard,
    deleteCard,
    previewMove,
    commitMove,
    restore,
  };
}
