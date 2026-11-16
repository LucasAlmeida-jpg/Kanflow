import assert from "node:assert/strict";
import { io as connect, type Socket } from "socket.io-client";

const B = process.env.API ?? "http://localhost:3001";

async function call(method: string, path: string, body?: unknown, socketId?: string) {
  const res = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json", ...(socketId && { "x-socket-id": socketId }) },
    body: body ? JSON.stringify(body) : null,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const board = (await call("POST", "/boards", { title: "Smoke" })).data;
const todo = (await call("POST", `/boards/${board.id}/columns`, { title: "A fazer" })).data;
await call("POST", `/boards/${board.id}/columns`, { title: "Feito" });
const c1 = (await call("POST", `/columns/${todo.id}/cards`, { title: "Card 1" })).data;
await call("POST", `/columns/${todo.id}/cards`, { title: "Card 2" });

const edited = (await call("PATCH", `/cards/${c1.id}`, { title: "Card 1 editado" })).data;
assert.equal(edited.title, "Card 1 editado");
assert.equal(edited.version, 2);

const full = (await call("GET", `/boards/${board.id}`)).data;
assert.deepEqual(full.columns.map((c: any) => c.title), ["A fazer", "Feito"]);
assert.deepEqual(full.columns[0].cards.map((c: any) => c.title), ["Card 1 editado", "Card 2"]);

const done = full.columns[1];
const c2 = full.columns[0].cards[1];
const c3 = (await call("POST", `/columns/${todo.id}/cards`, { title: "Card 3" })).data;
const titles = async () =>
  (await call("GET", `/boards/${board.id}`)).data.columns.map((c: any) => c.cards.map((k: any) => k.title));

await call("POST", `/cards/${c3.id}/move`, { columnId: todo.id, afterId: c1.id });
assert.deepEqual(await titles(), [["Card 3", "Card 1 editado", "Card 2"], []]);

await call("POST", `/cards/${c1.id}/move`, { columnId: done.id });
assert.deepEqual(await titles(), [["Card 3", "Card 2"], ["Card 1 editado"]]);

await call("POST", `/cards/${c2.id}/move`, { columnId: done.id, beforeId: c1.id });
assert.deepEqual(await titles(), [["Card 3"], ["Card 1 editado", "Card 2"]]);

await call("POST", `/cards/${c3.id}/move`, { columnId: done.id, beforeId: c1.id, afterId: c2.id });
assert.deepEqual(await titles(), [[], ["Card 1 editado", "Card 3", "Card 2"]]);

assert.equal((await call("POST", `/cards/${c3.id}/move`, { columnId: done.id, beforeId: c2.id, afterId: c1.id })).status, 400);
assert.equal((await call("POST", `/cards/${c3.id}/move`, { columnId: todo.id, beforeId: c1.id })).status, 400);
assert.equal((await call("POST", `/cards/${c3.id}/move`, { columnId: "nao-existe" })).status, 404);

assert.equal((await call("POST", "/boards", {})).status, 400);
assert.equal((await call("GET", "/boards/nao-existe")).status, 404);
assert.equal((await call("POST", "/columns/nao-existe/cards", { title: "x" })).status, 404);
assert.equal((await call("DELETE", `/cards/${c1.id}`)).status, 204);
assert.equal((await call("PATCH", `/cards/${c1.id}`, { title: "x" })).status, 404);

async function client() {
  const socket = connect(B, { transports: ["websocket"] });
  await new Promise((ok) => socket.once("connect", () => ok(null)));
  const events: [string, any][] = [];
  socket.onAny((event, data) => events.push([event, data]));
  return { socket, events };
}
const join = (s: Socket, id: string) => s.emitWithAck("board:join", id);
const settle = () => new Promise((ok) => setTimeout(ok, 150));

const rt = (await call("POST", "/boards", { title: "Realtime" })).data;
const a = await client();
const b = await client();
const outsider = await client();

assert.deepEqual(await join(a.socket, rt.id), { ok: true });
assert.deepEqual(await join(b.socket, rt.id), { ok: true });
assert.deepEqual(await join(outsider.socket, board.id), { ok: true });
assert.deepEqual(await join(a.socket, "nao-existe"), { error: "board não encontrado" });

const col = (await call("POST", `/boards/${rt.id}/columns`, { title: "Col" }, a.socket.id)).data;
const col2 = (await call("POST", `/boards/${rt.id}/columns`, { title: "Col 2" }, a.socket.id)).data;
const k = (await call("POST", `/columns/${col.id}/cards`, { title: "K" }, a.socket.id)).data;
await call("PATCH", `/cards/${k.id}`, { title: "K2" }, a.socket.id);
await call("POST", `/cards/${k.id}/move`, { columnId: col2.id }, a.socket.id);
await call("DELETE", `/cards/${k.id}`, undefined, a.socket.id);
await settle();

assert.deepEqual(b.events.map(([e]) => e), [
  "column:created", "column:created", "card:created", "card:updated", "card:moved", "card:deleted",
]);
assert.equal(b.events[3]![1].title, "K2");
assert.equal(b.events[4]![1].columnId, col2.id);
assert.deepEqual(b.events[5]![1], { id: k.id, columnId: col2.id });
assert.equal(a.events.length, 0);
assert.equal(outsider.events.length, 0);

assert.equal((await call("POST", `/cards/${c3.id}/move`, { columnId: col.id })).status, 400);

b.socket.emit("board:leave", rt.id);
await settle();
await call("POST", `/boards/${rt.id}/columns`, { title: "Col 3" });
await settle();
assert.equal(b.events.length, 6);
assert.equal(a.events.length, 1);

[a, b, outsider].forEach((c) => c.socket.disconnect());
console.log("smoke ok");
