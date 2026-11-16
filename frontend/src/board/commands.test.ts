import { describe, expect, it } from "vitest";
import type { BoardDetail, Card } from "../api";
import { boardReducer } from "./boardReducer";
import { placementOf, positionBetween, resolvePlacement, withVersion } from "./commands";

const card = (id: string, columnId: string, position: string): Card => ({
  id,
  title: id,
  description: "",
  position,
  version: 1,
  columnId,
  updatedAt: "",
});

const board = boardReducer(null, {
  type: "load",
  board: {
    id: "b",
    title: "Quadro",
    createdAt: "",
    columns: [
      { id: "todo", title: "A fazer", position: "a0", boardId: "b", cards: [card("a", "todo", "a0"), card("b", "todo", "a1"), card("c", "todo", "a2")] },
      { id: "done", title: "Feito", position: "a1", boardId: "b", cards: [] },
    ],
  } satisfies BoardDetail,
});

describe("placementOf", () => {
  it("devolve a coluna e os vizinhos do card", () => {
    expect(placementOf(board, "b")).toEqual({ columnId: "todo", beforeId: "a", afterId: "c" });
    expect(placementOf(board, "a")).toEqual({ columnId: "todo", afterId: "b" });
    expect(placementOf(board, "nope")).toBeNull();
  });

  it("pula vizinhos que ainda não existem no servidor", () => {
    expect(placementOf(board, "c", (id) => id === "b")).toEqual({ columnId: "todo", beforeId: "a" });
  });
});

describe("resolvePlacement", () => {
  it("coloca antes do vizinho de baixo quando ele ainda está na coluna", () => {
    const r = resolvePlacement(board, "x", { columnId: "todo", beforeId: "a", afterId: "c" });
    expect([r?.before?.id, r?.after?.id]).toEqual(["b", "c"]);
  });

  it("usa o vizinho de cima quando o de baixo saiu da coluna", () => {
    const r = resolvePlacement(board, "x", { columnId: "todo", beforeId: "a", afterId: "sumiu" });
    expect([r?.before?.id, r?.after?.id]).toEqual(["a", "b"]);
  });

  it("vai para o fim quando nenhum vizinho está mais lá", () => {
    const r = resolvePlacement(board, "x", { columnId: "todo", beforeId: "y", afterId: "z" });
    expect([r?.before?.id, r?.after?.id]).toEqual(["c", undefined]);
  });

  it("ignora o próprio card e devolve null para coluna inexistente", () => {
    const r = resolvePlacement(board, "b", { columnId: "todo", afterId: "c" });
    expect([r?.before?.id, r?.after?.id]).toEqual(["a", "c"]);
    expect(resolvePlacement(board, "b", { columnId: "nope" })).toBeNull();
  });

  it("gera posição entre os vizinhos", () => {
    const r = resolvePlacement(board, "x", { columnId: "todo", afterId: "b" })!;
    const pos = positionBetween(r.before, r.after);
    expect(pos > "a0" && pos < "a1").toBe(true);
  });
});

describe("withVersion", () => {
  it("atualiza a versão de comandos com versão e mantém create igual", () => {
    expect(withVersion({ kind: "delete", cardId: "a", version: 1 }, 4)).toEqual({ kind: "delete", cardId: "a", version: 4 });
    const create = { kind: "create", card: { id: "a", title: "a", description: "" }, to: { columnId: "todo" } } as const;
    expect(withVersion(create, 4)).toBe(create);
  });
});
