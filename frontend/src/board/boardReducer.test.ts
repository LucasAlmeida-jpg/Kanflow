import { describe, expect, it } from "vitest";
import type { BoardDetail, Card } from "../api";
import { boardReducer, findCard } from "./boardReducer";

const card = (id: string, columnId: string, position: string, version = 1): Card => ({
  id,
  title: id,
  description: "",
  position,
  version,
  columnId,
  updatedAt: "",
});

const board: BoardDetail = {
  id: "b",
  title: "Quadro",
  createdAt: "",
  columns: [
    { id: "doing", title: "Fazendo", position: "a1", boardId: "b", cards: [] },
    { id: "todo", title: "A fazer", position: "a0", boardId: "b", cards: [card("k2", "todo", "a1"), card("k1", "todo", "a0")] },
  ],
};

const titles = (s: ReturnType<typeof boardReducer>) => s!.columns.map((c) => [c.id, c.cards.map((k) => k.id)]);

describe("boardReducer", () => {
  const loaded = boardReducer(null, { type: "load", board });

  it("ordena colunas e cards por position ao carregar", () => {
    expect(titles(loaded)).toEqual([
      ["todo", ["k1", "k2"]],
      ["doing", []],
    ]);
  });

  it("move o card para outra coluna e mantém a ordem por position", () => {
    const s = boardReducer(loaded, { type: "cardUpsert", card: card("k1", "doing", "a0", 2) });
    expect(titles(s)).toEqual([
      ["todo", ["k2"]],
      ["doing", ["k1"]],
    ]);
  });

  it("ignora evento com versão mais antiga que a local", () => {
    const newer = boardReducer(loaded, { type: "cardUpsert", card: card("k1", "doing", "a0", 3) });
    const stale = boardReducer(newer, { type: "cardUpsert", card: card("k1", "todo", "a5", 2) });
    expect(stale).toBe(newer);
  });

  it("force aplica mesmo com versão mais antiga (rollback)", () => {
    const moved = boardReducer(loaded, { type: "cardUpsert", card: card("k1", "doing", "a0", 2) });
    const back = boardReducer(moved, { type: "cardUpsert", card: card("k1", "todo", "a0", 1), force: true });
    expect(titles(back)).toEqual(titles(loaded));
  });

  it("ignora card de coluna que não existe", () => {
    expect(boardReducer(loaded, { type: "cardUpsert", card: card("x", "nope", "a0") })).toBe(loaded);
  });

  it("prévia de arrasto insere no índice sem reordenar", () => {
    const s = boardReducer(loaded, { type: "cardPreview", id: "k2", columnId: "todo", index: 0 });
    expect(titles(s)[0]).toEqual(["todo", ["k2", "k1"]]);
    const across = boardReducer(loaded, { type: "cardPreview", id: "k1", columnId: "doing", index: 5 });
    expect(findCard(across, "k1")?.column.id).toBe("doing");
  });

  it("renomeia o quadro mantendo as colunas", () => {
    const s = boardReducer(loaded, { type: "boardUpdate", title: "Novo nome" });
    expect(s!.title).toBe("Novo nome");
    expect(s!.columns).toBe(loaded!.columns);
  });

  it("remove card e coluna", () => {
    const s = boardReducer(loaded, { type: "cardRemove", id: "k1" });
    expect(titles(s)[0]).toEqual(["todo", ["k2"]]);
    expect(boardReducer(s, { type: "columnRemove", id: "doing" })!.columns).toHaveLength(1);
  });

  it("restaura coluna apagada com os cards dela (rollback)", () => {
    const todo = loaded!.columns[0]!;
    const removed = boardReducer(loaded, { type: "columnRemove", id: todo.id });
    const restored = boardReducer(removed, { type: "columnUpsert", column: todo });
    expect(titles(restored)).toEqual(titles(loaded));
  });

  it("insere coluna nova na posição certa e preserva os cards ao atualizar", () => {
    const s = boardReducer(loaded, { type: "columnUpsert", column: { id: "first", title: "Antes", position: "Zz", boardId: "b" } });
    expect(s!.columns.map((c) => c.id)).toEqual(["first", "todo", "doing"]);
    const renamed = boardReducer(s, { type: "columnUpsert", column: { id: "todo", title: "Novo", position: "a0", boardId: "b" } });
    expect(findCard(renamed, "k1")?.column.title).toBe("Novo");
  });
});
