import { generateKeyBetween } from "fractional-indexing";
import type { Card } from "../api";
import { findCard, type BoardState } from "./boardReducer";

export type Placement = { columnId: string; beforeId?: string; afterId?: string };

export type CardPatch = { title?: string; description?: string };

export type Command =
  | { kind: "update"; cardId: string; patch: CardPatch; version: number }
  | { kind: "move"; cardId: string; to: Placement; version: number }
  | { kind: "create"; card: Pick<Card, "id" | "title" | "description">; to: Placement }
  | { kind: "delete"; cardId: string; version: number };

export type HistoryEntry = { label: string; undo: Command; redo: Command };

export const MAX_HISTORY = 50;

export function newCardId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function placementOf(state: BoardState, cardId: string, skip: (id: string) => boolean = () => false): Placement | null {
  const at = findCard(state, cardId);
  if (!at) return null;
  const cards = at.column.cards;
  let before: string | undefined;
  let after: string | undefined;
  for (let i = at.index - 1; i >= 0 && !before; i--) if (!skip(cards[i]!.id)) before = cards[i]!.id;
  for (let i = at.index + 1; i < cards.length && !after; i++) if (!skip(cards[i]!.id)) after = cards[i]!.id;
  return { columnId: at.column.id, ...(before && { beforeId: before }), ...(after && { afterId: after }) };
}

export function resolvePlacement(
  state: BoardState,
  cardId: string,
  to: Placement,
  skip: (id: string) => boolean = () => false,
): { before?: Card; after?: Card } | null {
  const column = state?.columns.find((c) => c.id === to.columnId);
  if (!column) return null;
  const cards = column.cards.filter((c) => c.id !== cardId && !skip(c.id));
  const afterIndex = to.afterId ? cards.findIndex((c) => c.id === to.afterId) : -1;
  const beforeIndex = to.beforeId ? cards.findIndex((c) => c.id === to.beforeId) : -1;
  const index = afterIndex !== -1 ? afterIndex : beforeIndex !== -1 ? beforeIndex + 1 : cards.length;
  const result: { before?: Card; after?: Card } = {};
  if (cards[index - 1]) result.before = cards[index - 1];
  if (cards[index]) result.after = cards[index];
  return result;
}

export function positionBetween(before?: Card, after?: Card) {
  return generateKeyBetween(before?.position ?? null, after?.position ?? null);
}

export function withVersion(cmd: Command, version: number): Command {
  return cmd.kind === "create" ? cmd : { ...cmd, version };
}
