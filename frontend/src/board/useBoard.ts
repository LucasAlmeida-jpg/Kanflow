import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { boardsApi, type Card, type Column, type ColumnWithCards } from "../api";
import { connectSocket, joinBoard, sendOp, type BoardSocket, type OpResult, type OpType } from "../api/socket";
import { boardReducer, findCard, type BoardState } from "./boardReducer";
import {
  MAX_HISTORY,
  newCardId,
  placementOf,
  positionBetween,
  resolvePlacement,
  withVersion,
  type CardPatch,
  type Command,
  type HistoryEntry,
  type Placement,
} from "./commands";

export type ConnectionStatus = "connecting" | "online" | "offline";

export type DragSnapshot = { card: Card; columnId: string; index: number; placement: Placement };

type ExecOptions = { state?: BoardState; rollbackCard?: Card; failPrefix?: string };

type History = { past: HistoryEntry[]; future: HistoryEntry[] };

const TEMP_PREFIX = "temp-";
export const isTemp = (id: string) => id.startsWith(TEMP_PREFIX);
const tempId = () => `${TEMP_PREFIX}${crypto.randomUUID()}`;
const SAVE_FAILED = "Não foi possível salvar";

function lastPosition(items: { position: string }[]) {
  return items.length ? items[items.length - 1]!.position : null;
}

function cardContent(card: Card) {
  return { id: card.id, title: card.title, description: card.description };
}

export function useBoard(boardId: string) {
  const [board, dispatch] = useReducer(boardReducer, null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [busy, setBusy] = useState(false);

  const socketRef = useRef<BoardSocket | null>(null);
  const boardRef = useRef<BoardState>(board);
  const pendingRef = useRef(pending);
  const historyRef = useRef(history);
  const busyRef = useRef(false);

  useEffect(() => {
    boardRef.current = board;
    pendingRef.current = pending;
    historyRef.current = history;
  }, [board, pending, history]);

  const isPending = useCallback((id: string) => isTemp(id) || pendingRef.current.has(id), []);

  const markPending = useCallback((id: string, on: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      pendingRef.current = next;
      return next;
    });
  }, []);

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
    socket.on("board:updated", ({ title }) => dispatch({ type: "boardUpdate", title }));
    socket.on("board:deleted", () => alive && setError("Este quadro foi apagado pelo dono."));
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
    async <T>(type: OpType, payload: object, rollback: () => void, failPrefix = SAVE_FAILED): Promise<OpResult<T>> => {
      const socket = socketRef.current;
      const res: OpResult<T> = socket?.connected
        ? await sendOp<T>(socket, type, payload)
        : { opId: "", ok: false, status: 0, error: "sem conexão com o servidor" };
      if (res.ok) return res;

      rollback();
      if (res.status === 409 && res.current) {
        dispatch({ type: "cardUpsert", card: res.current as Card, force: true });
        setNotice(
          failPrefix === SAVE_FAILED
            ? "Esse card foi alterado por outra pessoa. Mostrando a versão mais recente."
            : `${failPrefix}: o card foi alterado por outra pessoa.`,
        );
      } else {
        setNotice(`${failPrefix}: ${res.error}.`);
        if (res.status === 0 || res.status === 404) void reload();
      }
      return res;
    },
    [reload],
  );

  const upsert = useCallback((card: Card) => dispatch({ type: "cardUpsert", card, force: true }), []);

  const exec = useCallback(
    async (cmd: Command, options: ExecOptions = {}): Promise<Card | true | null> => {
      const state = options.state ?? boardRef.current;
      const failPrefix = options.failPrefix ?? SAVE_FAILED;
      const gone = () => {
        setNotice(`${failPrefix}: o card não existe mais.`);
        return null;
      };

      if (cmd.kind === "create") {
        const spot = resolvePlacement(state, cmd.card.id, cmd.to, isPending);
        if (!spot || isTemp(cmd.to.columnId)) return gone();
        const optimistic: Card = {
          ...cmd.card,
          columnId: cmd.to.columnId,
          position: positionBetween(spot.before, spot.after),
          version: 1,
          updatedAt: new Date().toISOString(),
        };
        markPending(cmd.card.id, true);
        upsert(optimistic);
        const res = await run<Card>(
          "createCard",
          { ...cmd.card, columnId: cmd.to.columnId },
          () => dispatch({ type: "cardRemove", id: cmd.card.id }),
          failPrefix,
        );
        if (!res.ok) {
          markPending(cmd.card.id, false);
          return null;
        }
        let created = res.result;
        if (spot.after) {
          const atEnd = created;
          const moved = await run<Card>(
            "moveCard",
            { id: created.id, columnId: created.columnId, beforeId: spot.before?.id, afterId: spot.after.id, version: created.version },
            () => upsert(atEnd),
            failPrefix,
          );
          if (moved.ok) created = moved.result;
        }
        upsert(created);
        markPending(cmd.card.id, false);
        return created;
      }

      const at = findCard(state, cmd.cardId);
      if (!at) return gone();
      const rollbackCard = options.rollbackCard ?? at.card;

      if (cmd.kind === "update") {
        upsert({ ...at.card, ...cmd.patch, version: at.card.version + 1 });
        const res = await run<Card>("updateCard", { id: cmd.cardId, ...cmd.patch, version: cmd.version }, () => upsert(rollbackCard), failPrefix);
        if (!res.ok) return null;
        upsert(res.result);
        return res.result;
      }

      if (cmd.kind === "move") {
        const spot = resolvePlacement(state, cmd.cardId, cmd.to, isPending);
        if (!spot) return gone();
        let position: string;
        try {
          position = positionBetween(spot.before, spot.after);
        } catch {
          upsert(rollbackCard);
          return null;
        }
        upsert({ ...at.card, columnId: cmd.to.columnId, position, version: at.card.version + 1 });
        const res = await run<Card>(
          "moveCard",
          { id: cmd.cardId, columnId: cmd.to.columnId, beforeId: spot.before?.id, afterId: spot.after?.id, version: cmd.version },
          () => upsert(rollbackCard),
          failPrefix,
        );
        if (!res.ok) return null;
        upsert(res.result);
        return res.result;
      }

      dispatch({ type: "cardRemove", id: cmd.cardId });
      const res = await run("deleteCard", { id: cmd.cardId, version: cmd.version }, () => upsert(rollbackCard), failPrefix);
      return res.ok ? true : null;
    },
    [isPending, markPending, run, upsert],
  );

  const record = useCallback((entry: HistoryEntry) => {
    setHistory((h) => ({ past: [...h.past, entry].slice(-MAX_HISTORY), future: [] }));
  }, []);

  const step = useCallback(
    async (direction: "undo" | "redo") => {
      const stack = direction === "undo" ? historyRef.current.past : historyRef.current.future;
      const entry = stack[stack.length - 1];
      if (!entry || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);

      const forward = direction === "undo" ? entry.undo : entry.redo;
      let backward = direction === "undo" ? entry.redo : entry.undo;
      if (forward.kind === "delete" && backward.kind === "create") {
        const current = findCard(boardRef.current, forward.cardId)?.card;
        const to = placementOf(boardRef.current, forward.cardId, isPending);
        if (current && to) backward = { ...backward, card: cardContent(current), to };
      }

      const result = await exec(forward, { failPrefix: direction === "undo" ? "Não foi possível desfazer" : "Não foi possível refazer" });
      if (result && result !== true) backward = withVersion(backward, result.version);
      const updated: HistoryEntry = direction === "undo" ? { ...entry, redo: backward } : { ...entry, undo: backward };

      setHistory((h) => {
        const past = h.past.filter((e) => e !== entry);
        const future = h.future.filter((e) => e !== entry);
        if (!result) return { past, future };
        return direction === "undo" ? { past, future: [...future, updated] } : { past: [...past, updated], future };
      });
      busyRef.current = false;
      setBusy(false);
    },
    [exec, isPending],
  );

  const createColumn = useCallback(
    (title: string) => {
      const state = boardRef.current;
      if (!state) return;
      const temp: Column = { id: tempId(), title, boardId, position: generateKeyBetween(lastPosition(state.columns), null) };
      dispatch({ type: "columnUpsert", column: temp });
      void run<Column>("createColumn", { boardId, title }, () => dispatch({ type: "columnRemove", id: temp.id })).then((res) => {
        if (!res.ok) return;
        dispatch({ type: "columnRemove", id: temp.id });
        dispatch({ type: "columnUpsert", column: res.result });
      });
    },
    [boardId, run],
  );

  const deleteColumn = useCallback(
    (column: ColumnWithCards) => {
      if (isTemp(column.id)) return;
      dispatch({ type: "columnRemove", id: column.id });
      void run("deleteColumn", { id: column.id }, () => dispatch({ type: "columnUpsert", column }));
    },
    [run],
  );

  const createCard = useCallback(
    async (columnId: string, title: string) => {
      const card = { id: newCardId(), title, description: "" };
      const to: Placement = { columnId };
      const created = await exec({ kind: "create", card, to });
      if (!created || created === true) return;
      record({
        label: `criar "${title}"`,
        undo: { kind: "delete", cardId: card.id, version: created.version },
        redo: { kind: "create", card, to },
      });
    },
    [exec, record],
  );

  const updateCard = useCallback(
    async (cardId: string, patch: CardPatch) => {
      const card = findCard(boardRef.current, cardId)?.card;
      if (!card || isPending(cardId)) return;
      const previous: CardPatch = {};
      if (patch.title !== undefined) previous.title = card.title;
      if (patch.description !== undefined) previous.description = card.description;
      const updated = await exec({ kind: "update", cardId, patch, version: card.version });
      if (!updated || updated === true) return;
      record({
        label: `editar "${card.title}"`,
        undo: { kind: "update", cardId, patch: previous, version: updated.version },
        redo: { kind: "update", cardId, patch, version: updated.version },
      });
    },
    [exec, isPending, record],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      const state = boardRef.current;
      const card = findCard(state, cardId)?.card;
      const to = placementOf(state, cardId, isPending);
      if (!card || !to || isPending(cardId)) return;
      const ok = await exec({ kind: "delete", cardId, version: card.version });
      if (!ok) return;
      record({
        label: `apagar "${card.title}"`,
        undo: { kind: "create", card: cardContent(card), to },
        redo: { kind: "delete", cardId, version: card.version },
      });
    },
    [exec, isPending, record],
  );

  const previewMove = useCallback((id: string, columnId: string, index: number) => {
    dispatch({ type: "cardPreview", id, columnId, index });
  }, []);

  const restore = useCallback((snapshot: DragSnapshot) => upsert(snapshot.card), [upsert]);

  const commitMove = useCallback(
    async (state: BoardState, snapshot: DragSnapshot) => {
      const { card } = snapshot;
      const at = findCard(state, card.id);
      if (!at || (at.column.id === snapshot.columnId && at.index === snapshot.index)) return restore(snapshot);
      const to = placementOf(state, card.id, isPending);
      if (!to) return restore(snapshot);
      const moved = await exec({ kind: "move", cardId: card.id, to, version: card.version }, { state, rollbackCard: card });
      if (!moved || moved === true) return;
      record({
        label: `mover "${card.title}"`,
        undo: { kind: "move", cardId: card.id, to: snapshot.placement, version: moved.version },
        redo: { kind: "move", cardId: card.id, to, version: moved.version },
      });
    },
    [exec, isPending, record, restore],
  );

  const lastPast = history.past[history.past.length - 1];
  const lastFuture = history.future[history.future.length - 1];

  return {
    board,
    error,
    status,
    notice,
    dismissNotice: () => setNotice(null),
    isPending,
    createColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    previewMove,
    commitMove,
    restore,
    undo: () => void step("undo"),
    redo: () => void step("redo"),
    canUndo: !!lastPast && !busy,
    canRedo: !!lastFuture && !busy,
    undoLabel: lastPast?.label,
    redoLabel: lastFuture?.label,
  };
}
