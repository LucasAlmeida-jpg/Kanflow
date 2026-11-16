import { describe, expect, it } from "vitest";
import type { Activity } from "../api";
import { describeActivity, timeAgo } from "./activity";

const activity = (event: string, before: unknown, after: unknown): Activity => ({
  id: "a",
  boardId: "b",
  event,
  entityId: "e",
  before,
  after,
  createdAt: "",
  actor: null,
});

const columnName = (id: string | undefined) => (id === "todo" ? '"A fazer"' : id === "done" ? '"Feito"' : "uma coluna apagada");

describe("describeActivity", () => {
  it("descreve cada tipo de evento", () => {
    expect(describeActivity(activity("card:created", null, { title: "Login", columnId: "todo" }), columnName)).toBe(
      'criou o card "Login" em "A fazer"',
    );
    expect(describeActivity(activity("card:updated", { title: "A" }, { title: "B" }), columnName)).toBe(
      'renomeou o card "A" para "B"',
    );
    expect(describeActivity(activity("card:updated", { title: "A" }, { title: "A" }), columnName)).toBe(
      'editou a descrição do card "A"',
    );
    expect(
      describeActivity(activity("card:moved", { title: "A", columnId: "todo" }, { title: "A", columnId: "done" }), columnName),
    ).toBe('moveu o card "A" para "Feito"');
    expect(
      describeActivity(activity("card:moved", { title: "A", columnId: "todo" }, { title: "A", columnId: "todo" }), columnName),
    ).toBe('reordenou o card "A" em "A fazer"');
    expect(describeActivity(activity("card:deleted", { title: "A" }, null), columnName)).toBe('apagou o card "A"');
    expect(describeActivity(activity("column:created", null, { title: "Doing" }), columnName)).toBe('criou a coluna "Doing"');
    expect(describeActivity(activity("board:updated", { title: "A" }, { title: "B" }), columnName)).toBe('renomeou o quadro "A" para "B"');
    expect(describeActivity(activity("member:added", null, { id: "u2", name: "Ana" }), columnName)).toBe("adicionou Ana ao quadro");
    const joined = { ...activity("member:added", null, { id: "u2", name: "Ana" }), actor: { id: "u2", name: "Ana" } };
    expect(describeActivity(joined, columnName)).toBe("entrou no quadro");
    expect(describeActivity(activity("member:removed", { id: "u2", name: "Ana" }, null), columnName)).toBe("removeu Ana do quadro");
    const left = { ...activity("member:removed", { id: "u2", name: "Ana" }, null), actor: { id: "u2", name: "Ana" } };
    expect(describeActivity(left, columnName)).toBe("saiu do quadro");
    expect(describeActivity(activity("column:deleted", { title: "Doing" }, null), columnName)).toBe('apagou a coluna "Doing"');
  });

  it("cita coluna apagada quando ela não existe mais", () => {
    expect(describeActivity(activity("card:created", null, { title: "X", columnId: "sumiu" }), columnName)).toBe(
      'criou o card "X" em uma coluna apagada',
    );
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  it("formata em português", () => {
    expect(timeAgo("2026-11-16T11:59:50Z", now)).toBe("agora");
    expect(timeAgo("2026-11-16T11:55:00Z", now)).toBe("há 5 minutos");
    expect(timeAgo("2026-11-16T10:00:00Z", now)).toBe("há 2 horas");
    expect(timeAgo("2026-11-15T12:00:00Z", now)).toBe("ontem");
  });
});
