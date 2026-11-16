import assert from "node:assert/strict";
import { io as connect, type Socket } from "socket.io-client";

const B = process.env.API ?? "http://localhost:3001";

let token = "";

async function call(method: string, path: string, body?: unknown, socketId?: string, as: string = token) {
  const res = await fetch(B + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(as && { authorization: `Bearer ${as}` }),
      ...(socketId && { "x-socket-id": socketId }),
    },
    body: body ? JSON.stringify(body) : null,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const email = `smoke-${crypto.randomUUID()}@kanflow.dev`;
const registered = await call("POST", "/auth/register", { email, name: "Smoke", password: "senha-segura" });
assert.equal(registered.status, 201);
token = registered.data.token;

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

async function client(as: string = token) {
  const socket = connect(B, { transports: ["websocket"], auth: { token: as } });
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

const c = await client();
const d = await client();
await join(c.socket, rt.id);
await join(d.socket, rt.id);
const op = (type: string, payload: unknown, opId: string = crypto.randomUUID()) =>
  c.socket.emitWithAck("op", { opId, type, payload });

const created = await op("createCard", { columnId: col.id, title: "Via socket" }, "op-1");
assert.equal(created.ok, true);
assert.equal(created.opId, "op-1");
assert.equal(created.result.title, "Via socket");

const again = await op("createCard", { columnId: col.id, title: "Via socket" }, "op-1");
assert.deepEqual(again, created);

const [p1, p2] = await Promise.all([
  op("createCard", { columnId: col.id, title: "Paralelo" }, "op-2"),
  op("createCard", { columnId: col.id, title: "Paralelo" }, "op-2"),
]);
assert.deepEqual(p1, p2);

const moved = await op("moveCard", { id: created.result.id, columnId: col2.id });
assert.equal(moved.ok, true);
assert.equal(moved.result.columnId, col2.id);
const updated = await op("updateCard", { id: created.result.id, title: "Editado via socket" });
assert.equal(updated.result.version, 3);

assert.deepEqual(await op("dropTable", {}, "op-x"), { opId: "op-x", ok: false, status: 400, error: "op desconhecida" });
assert.deepEqual(await op("createCard", { columnId: col.id }, "op-y"), { opId: "op-y", ok: false, status: 400, error: "title é obrigatório" });
assert.deepEqual(await op("updateCard", { id: "nao-existe", title: "x" }, "op-z"), { opId: "op-z", ok: false, status: 404, error: "card não encontrado" });
assert.equal((await c.socket.emitWithAck("op", { type: "createCard", payload: {} })).error, "opId é obrigatório");
await settle();

assert.deepEqual(d.events.map(([e]) => e), ["card:created", "card:created", "card:moved", "card:updated"]);
assert.equal(c.events.length, 0);
const rtBoard = (await call("GET", `/boards/${rt.id}`)).data;
assert.deepEqual(rtBoard.columns.map((x: any) => x.cards.map((k: any) => k.title)), [["Paralelo"], ["Editado via socket"], []]);

const kid = created.result.id;
d.events.length = 0;

const v4 = await op("updateCard", { id: kid, title: "Versão 4", version: 3 });
assert.equal(v4.ok, true);
assert.equal(v4.result.version, 4);

const stale = await op("updateCard", { id: kid, title: "Atrasado", version: 3 });
assert.equal(stale.ok, false);
assert.equal(stale.status, 409);
assert.equal(stale.current.version, 4);
assert.equal(stale.current.title, "Versão 4");

assert.equal((await op("moveCard", { id: kid, columnId: col.id, version: 3 })).status, 409);
assert.equal((await op("deleteCard", { id: kid, version: 3 })).status, 409);
assert.equal((await op("updateCard", { id: kid, title: "x", version: "4" })).status, 400);

const restStale = await call("PATCH", `/cards/${kid}`, { title: "REST atrasado", version: 2 });
assert.equal(restStale.status, 409);
assert.equal(restStale.data.current.title, "Versão 4");

assert.equal((await op("deleteCard", { id: kid, version: 4 })).ok, true);
await settle();
assert.deepEqual(d.events.map(([e]) => e), ["card:updated", "card:deleted"]);

const log = (await call("GET", `/boards/${rt.id}/activity?limit=3`)).data;
assert.deepEqual(log.map((x: any) => x.event), ["card:deleted", "card:updated", "card:updated"]);
assert.equal(log[0].entityId, kid);
assert.equal(log[0].before.title, "Versão 4");
assert.equal(log[0].after, null);
assert.equal(log[1].before.title, "Editado via socket");
assert.equal(log[1].after.title, "Versão 4");
assert.equal((await call("GET", `/boards/${rt.id}/activity`)).data.length, 13);
assert.equal((await call("GET", `/boards/nao-existe/activity`)).status, 404);

assert.equal((await call("GET", "/boards", undefined, undefined, "")).status, 401);
assert.equal((await call("GET", "/boards", undefined, undefined, "token-falso")).status, 401);
assert.equal((await call("GET", "/me")).data.email, email);
assert.equal((await call("POST", "/auth/register", { email, name: "X", password: "senha-segura" })).status, 409);
assert.equal((await call("POST", "/auth/register", { email: "x@y.z", name: "X", password: "curta" })).status, 400);
assert.equal((await call("POST", "/auth/register", { email: "invalido", name: "X", password: "senha-segura" })).status, 400);
assert.equal((await call("POST", "/auth/login", { email, password: "errada!!" })).status, 401);
assert.equal((await call("POST", "/auth/login", { email: "ninguem@x.com", password: "senha-segura" })).status, 401);
const login = await call("POST", "/auth/login", { email: email.toUpperCase(), password: "senha-segura" });
assert.equal(login.status, 200);
assert.equal((await call("GET", "/me", undefined, undefined, login.data.token)).data.email, email);

const noAuth = connect(B, { transports: ["websocket"], auth: { token: "token-falso" } });
const refused = await new Promise<Error>((ok) => noAuth.once("connect_error", ok));
assert.equal(refused.message, "não autenticado");
noAuth.close();

const email2 = `smoke2-${crypto.randomUUID()}@kanflow.dev`;
const token2 = (await call("POST", "/auth/register", { email: email2, name: "Outra Pessoa", password: "senha-segura" })).data.token;
const e = await client(token2);
const card = (await op("createCard", { columnId: col.id, title: "Privado" })).result;

assert.deepEqual((await call("GET", "/boards", undefined, undefined, token2)).data, []);
assert.equal((await call("GET", `/boards/${rt.id}`, undefined, undefined, token2)).status, 404);
assert.equal((await call("GET", `/boards/${rt.id}/activity`, undefined, undefined, token2)).status, 404);
assert.equal((await call("GET", `/boards/${rt.id}/members`, undefined, undefined, token2)).status, 404);
assert.equal((await call("POST", `/boards/${rt.id}/columns`, { title: "x" }, undefined, token2)).status, 404);
assert.deepEqual(await join(e.socket, rt.id), { error: "board não encontrado" });
const peek = await e.socket.emitWithAck("op", { opId: "peek", type: "updateCard", payload: { id: card.id, title: "x", version: 99 } });
assert.equal(peek.status, 404);
assert.equal(peek.current, undefined);
assert.equal((await e.socket.emitWithAck("op", { opId: "mv", type: "moveCard", payload: { id: card.id, columnId: col.id } })).status, 404);

assert.equal((await call("POST", `/boards/${rt.id}/members`, { email: "ninguem@x.com" })).status, 404);
const added = await call("POST", `/boards/${rt.id}/members`, { email: email2.toUpperCase() });
assert.equal(added.status, 201);
assert.equal(added.data.role, "member");
assert.equal((await call("POST", `/boards/${rt.id}/members`, { email: email2 }, undefined, token2)).status, 403);
assert.deepEqual((await call("GET", `/boards/${rt.id}/members`, undefined, undefined, token2)).data.map((m: any) => m.role), ["owner", "member"]);
assert.deepEqual((await call("GET", "/boards", undefined, undefined, token2)).data.map((x: any) => x.id), [rt.id]);

assert.deepEqual(await join(e.socket, rt.id), { ok: true });
d.events.length = 0;
const byOther = await e.socket.emitWithAck("op", { opId: "op-other", type: "updateCard", payload: { id: card.id, title: "Editado pela outra" } });
assert.equal(byOther.ok, true);
await call("PATCH", `/cards/${card.id}`, { title: "Via REST da outra" }, d.socket.id, token2);
await settle();
assert.deepEqual(d.events.map(([ev]) => ev), ["card:updated", "card:updated"]);
assert.deepEqual(e.events.map(([ev, x]) => [ev, x.title]), [["card:updated", "Via REST da outra"]]);

const [last] = (await call("GET", `/boards/${rt.id}/activity?limit=1`)).data;
assert.equal(last.actor.name, "Outra Pessoa");

const loggedOut = await client(login.data.token);
const kicked = new Promise<string>((ok) => loggedOut.socket.once("disconnect", ok));
assert.equal((await call("POST", "/auth/logout", undefined, undefined, login.data.token)).status, 204);
assert.equal(await kicked, "io server disconnect");
assert.equal(d.socket.connected, true);
assert.equal((await call("GET", "/me", undefined, undefined, login.data.token)).status, 401);
assert.equal((await call("GET", "/me")).status, 200);

const doomed = (await op("createColumn", { boardId: rt.id, title: "Apagar" })).result;
await op("createCard", { columnId: doomed.id, title: "Vai junto 1" });
await op("createCard", { columnId: doomed.id, title: "Vai junto 2" });
await settle();
d.events.length = 0;

const removed = await op("deleteColumn", { id: doomed.id });
assert.equal(removed.ok, true);
assert.deepEqual(removed.result, { id: doomed.id });
await settle();
assert.deepEqual(d.events, [["column:deleted", { id: doomed.id }]]);
const afterDelete = (await call("GET", `/boards/${rt.id}`)).data;
assert.equal(afterDelete.columns.some((x: any) => x.id === doomed.id), false);
const [deletedLog] = (await call("GET", `/boards/${rt.id}/activity?limit=1`)).data;
assert.equal(deletedLog.event, "column:deleted");
assert.equal(deletedLog.after, null);
assert.deepEqual(deletedLog.before.cards.map((x: any) => x.title), ["Vai junto 1", "Vai junto 2"]);
assert.equal((await call("DELETE", `/columns/${doomed.id}`)).status, 404);
assert.equal((await call("DELETE", "/columns/nao-existe")).status, 404);
const restCol = (await call("POST", `/boards/${rt.id}/columns`, { title: "Via REST" })).data;
assert.equal((await call("DELETE", `/columns/${restCol.id}`)).status, 204);

const strangerToken = (await call("POST", "/auth/register", { email: `s-${crypto.randomUUID()}@kanflow.dev`, name: "Estranho", password: "senha-segura" })).data.token;
assert.equal((await call("DELETE", `/columns/${col.id}`, undefined, undefined, strangerToken)).status, 404);

const chosenId = crypto.randomUUID().replaceAll("-", "");
const withId = await op("createCard", { id: chosenId, columnId: col.id, title: "Id do cliente" });
assert.equal(withId.ok, true);
assert.equal(withId.result.id, chosenId);
assert.equal((await op("createCard", { id: chosenId, columnId: col.id, title: "Repetido" })).status, 409);
assert.equal((await op("createCard", { id: "Inválido!", columnId: col.id, title: "x" })).status, 400);
assert.equal((await op("deleteCard", { id: chosenId })).ok, true);
const recreated = await op("createCard", { id: chosenId, columnId: col.id, title: "Recriado" });
assert.equal(recreated.ok, true);
assert.equal(recreated.result.version, 1);

d.events.length = 0;
const renamed = await call("PATCH", `/boards/${rt.id}`, { title: "Realtime renomeado" }, undefined, token2);
assert.equal(renamed.status, 200);
assert.equal(renamed.data.title, "Realtime renomeado");
await settle();
assert.deepEqual(d.events, [["board:updated", { id: rt.id, title: "Realtime renomeado" }]]);
assert.equal((await call("PATCH", `/boards/${rt.id}`, { title: "" })).status, 400);
assert.equal((await call("PATCH", `/boards/${rt.id}`, { title: "x" }, undefined, strangerToken)).status, 404);
const [renameLog] = (await call("GET", `/boards/${rt.id}/activity?limit=1`)).data;
assert.equal(renameLog.event, "board:updated");
assert.deepEqual([renameLog.before.title, renameLog.after.title], ["Realtime", "Realtime renomeado"]);
assert.equal((await call("GET", "/boards")).data.find((x: any) => x.id === rt.id).role, "owner");
const listed = (await call("GET", "/boards", undefined, undefined, token2)).data.find((x: any) => x.id === rt.id);
assert.equal(listed.owner, "Smoke");
assert.equal(listed.memberCount, 2);
assert.equal(listed.lastActivityAt, renameLog.createdAt);
assert.equal((await call("GET", "/boards", undefined, undefined, token2)).data.find((x: any) => x.id === rt.id).role, "member");

const toDelete = (await call("POST", "/boards", { title: "Para apagar" })).data;
assert.equal(toDelete.role, "owner");
await call("POST", `/boards/${toDelete.id}/members`, { email: email2 });
await join(d.socket, toDelete.id);
d.events.length = 0;
assert.equal((await call("DELETE", `/boards/${toDelete.id}`, undefined, undefined, token2)).status, 403);
assert.equal((await call("DELETE", `/boards/${toDelete.id}`, undefined, undefined, strangerToken)).status, 404);
assert.equal((await call("DELETE", `/boards/${toDelete.id}`)).status, 204);
await settle();
assert.deepEqual(d.events, [["board:deleted", { id: toDelete.id }]]);
assert.equal((await call("GET", `/boards/${toDelete.id}`)).status, 404);
assert.equal((await call("GET", "/boards", undefined, undefined, token2)).data.some((x: any) => x.id === toDelete.id), false);

const ownerId = (await call("GET", "/me")).data.id;
const user2Id = (await call("GET", "/me", undefined, undefined, token2)).data.id;
const team = (await call("POST", "/boards", { title: "Equipe" })).data;
await join(d.socket, team.id);
d.events.length = 0;
const invited = await call("POST", `/boards/${team.id}/members`, { email: email2 });
assert.equal(invited.status, 201);
assert.deepEqual(invited.data, { id: user2Id, name: "Outra Pessoa", email: email2, role: "member" });
assert.equal((await call("POST", `/boards/${team.id}/members`, { email: email2 })).status, 409);
assert.equal((await call("POST", `/boards/${team.id}/members`, { email: "ninguem@x.com" })).status, 404);
assert.equal((await call("POST", `/boards/${team.id}/members`, { email: email2 }, undefined, token2)).status, 403);
await settle();
assert.deepEqual(d.events, [["member:added", invited.data]]);

assert.deepEqual(await join(e.socket, team.id), { ok: true });
e.events.length = 0;
assert.equal((await call("DELETE", `/boards/${team.id}/members/${ownerId}`, undefined, undefined, token2)).status, 403);
assert.equal((await call("DELETE", `/boards/${team.id}/members/${ownerId}`)).status, 400);
assert.equal((await call("DELETE", `/boards/${team.id}/members/nao-existe`)).status, 404);
assert.equal((await call("DELETE", `/boards/${team.id}/members/${user2Id}`, undefined, undefined, strangerToken)).status, 404);

assert.equal((await call("DELETE", `/boards/${team.id}/members/${user2Id}`)).status, 204);
await settle();
assert.deepEqual(e.events, [["member:removed", { id: user2Id }]]);
await call("POST", `/boards/${team.id}/columns`, { title: "Depois da remoção" });
await settle();
assert.equal(e.events.length, 1);
assert.equal((await call("GET", `/boards/${team.id}`, undefined, undefined, token2)).status, 404);
const kickedOp = await e.socket.emitWithAck("op", { opId: "kicked", type: "createColumn", payload: { boardId: team.id, title: "x" } });
assert.equal(kickedOp.status, 404);

await call("POST", `/boards/${team.id}/members`, { email: email2 });
assert.equal((await call("DELETE", `/boards/${team.id}/members/${user2Id}`, undefined, undefined, token2)).status, 204);
const teamLog = (await call("GET", `/boards/${team.id}/activity?limit=4`)).data;
assert.deepEqual(teamLog.map((x: any) => x.event), ["member:removed", "member:added", "column:created", "member:removed"]);
assert.equal(teamLog[0].actor.id, user2Id);
assert.equal(teamLog[0].before.name, "Outra Pessoa");
assert.deepEqual((await call("GET", `/boards/${team.id}/members`)).data.map((m: any) => m.role), ["owner"]);

const long = "x".repeat(201);
assert.equal((await call("POST", "/boards", { title: long })).status, 400);
assert.equal((await call("POST", `/columns/${col.id}/cards`, { title: "ok", description: "x".repeat(10_001) })).status, 400);
assert.equal((await call("PATCH", `/cards/${card.id}`, { description: "x".repeat(10_001) })).status, 400);
assert.equal((await op("createCard", { columnId: col.id, title: long })).status, 400);
assert.equal((await call("POST", "/auth/register", { email: `n-${crypto.randomUUID()}@x.dev`, name: "x".repeat(101), password: "senha-segura" })).status, 400);
assert.equal((await call("POST", "/auth/register", { email: `p-${crypto.randomUUID()}@x.dev`, name: "P", password: "x".repeat(201) })).status, 400);

const target = `alvo-${crypto.randomUUID()}@kanflow.dev`;
for (let i = 0; i < 10; i++) {
  assert.equal((await call("POST", "/auth/login", { email: target, password: `tentativa-${i}` })).status, 401);
}
const blocked = await fetch(`${B}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: target.toUpperCase(), password: "mais-uma" }),
});
assert.equal(blocked.status, 429);
assert.ok(Number(blocked.headers.get("retry-after")) > 0);
assert.equal((await call("POST", "/auth/login", { email, password: "senha-segura" })).status, 200);

const flood = await Promise.all(
  Array.from({ length: 120 }, (_, i) => e.socket.emitWithAck("op", { opId: `flood-${i}`, type: "nada", payload: {} })),
);
assert.ok(flood.some((r) => r.status === 429));
assert.ok(flood.filter((r) => r.status === 400).length <= 100);

[a, b, c, d, e, outsider].forEach((x) => x.socket.disconnect());
console.log("smoke ok");
