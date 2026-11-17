import { useCallback, type RefObject } from "react";
import { findCard, type BoardState } from "../boardReducer";
import { newCardId, placementOf, type CardPatch, type Command, type HistoryEntry, type Placement } from "../commands";
import type { DragSnapshot, ExecOptions, ExecResult } from "./useBoardOps";
import { cardContent } from "./useHistory";

type Deps = {
  exec: (cmd: Command, options?: ExecOptions) => Promise<ExecResult>;
  record: (entry: HistoryEntry) => void;
  restore: (snapshot: DragSnapshot) => void;
  isPending: (id: string) => boolean;
  boardRef: RefObject<BoardState>;
};

export function useCardActions({ exec, record, restore, isPending, boardRef }: Deps) {
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
    [boardRef, exec, isPending, record],
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
    [boardRef, exec, isPending, record],
  );

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

  return { createCard, updateCard, deleteCard, commitMove };
}
