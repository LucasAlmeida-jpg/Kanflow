import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Card } from "../../api";
import { findCard, type BoardState } from "../boardReducer";
import { MAX_HISTORY, placementOf, withVersion, type Command, type HistoryEntry } from "../commands";
import type { ExecOptions, ExecResult } from "./useBoardOps";

type History = { past: HistoryEntry[]; future: HistoryEntry[] };

type Deps = {
  exec: (cmd: Command, options?: ExecOptions) => Promise<ExecResult>;
  isPending: (id: string) => boolean;
  boardRef: RefObject<BoardState>;
};

export function cardContent(card: Card) {
  return { id: card.id, title: card.title, description: card.description };
}

export function useHistory({ exec, isPending, boardRef }: Deps) {
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [busy, setBusy] = useState(false);
  const historyRef = useRef(history);
  const busyRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

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
    [boardRef, exec, isPending],
  );

  const lastPast = history.past[history.past.length - 1];
  const lastFuture = history.future[history.future.length - 1];

  return {
    record,
    undo: () => void step("undo"),
    redo: () => void step("redo"),
    canUndo: !!lastPast && !busy,
    canRedo: !!lastFuture && !busy,
    undoLabel: lastPast?.label,
    redoLabel: lastFuture?.label,
  };
}
