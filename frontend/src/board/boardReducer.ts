import type { BoardDetail, Card, Column, ColumnWithCards } from "../api";

export type BoardState = BoardDetail | null;

export type BoardAction =
  | { type: "load"; board: BoardDetail }
  | { type: "boardUpdate"; title: string }
  | { type: "columnUpsert"; column: Column | ColumnWithCards }
  | { type: "columnRemove"; id: string }
  | { type: "cardUpsert"; card: Card; force?: boolean }
  | { type: "cardRemove"; id: string }
  | { type: "cardPreview"; id: string; columnId: string; index: number };

const byPosition = <T extends { position: string; id: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1;

export function findCard(board: BoardState, id: string) {
  for (const column of board?.columns ?? []) {
    const index = column.cards.findIndex((c) => c.id === id);
    if (index !== -1) return { card: column.cards[index]!, column, index };
  }
  return null;
}

function withoutCard(columns: ColumnWithCards[], id: string) {
  return columns.map((col) => (col.cards.some((c) => c.id === id) ? { ...col, cards: col.cards.filter((c) => c.id !== id) } : col));
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (action.type === "load") {
    return {
      ...action.board,
      columns: [...action.board.columns]
        .sort(byPosition)
        .map((col) => ({ ...col, cards: [...col.cards].sort(byPosition) })),
    };
  }
  if (!state) return state;

  switch (action.type) {
    case "boardUpdate":
      return { ...state, title: action.title };

    case "columnUpsert": {
      const existing = state.columns.find((c) => c.id === action.column.id);
      const cards = "cards" in action.column ? action.column.cards : (existing?.cards ?? []);
      const column: ColumnWithCards = { ...action.column, cards };
      const others = state.columns.filter((c) => c.id !== action.column.id);
      return { ...state, columns: [...others, column].sort(byPosition) };
    }

    case "columnRemove":
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };

    case "cardUpsert": {
      const { card, force } = action;
      const current = findCard(state, card.id);
      if (current && !force && current.card.version > card.version) return state;
      if (!state.columns.some((c) => c.id === card.columnId)) return state;
      const columns = withoutCard(state.columns, card.id).map((col) =>
        col.id === card.columnId ? { ...col, cards: [...col.cards, card].sort(byPosition) } : col,
      );
      return { ...state, columns };
    }

    case "cardRemove":
      return findCard(state, action.id) ? { ...state, columns: withoutCard(state.columns, action.id) } : state;

    case "cardPreview": {
      const current = findCard(state, action.id);
      if (!current || !state.columns.some((c) => c.id === action.columnId)) return state;
      const moved = { ...current.card, columnId: action.columnId };
      const columns = withoutCard(state.columns, action.id).map((col) => {
        if (col.id !== action.columnId) return col;
        const cards = [...col.cards];
        cards.splice(Math.max(0, Math.min(action.index, cards.length)), 0, moved);
        return { ...col, cards };
      });
      return { ...state, columns };
    }
  }
}
