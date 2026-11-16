// Smoke test das rotas REST. Rode com o servidor de pé: npm run smoke
import assert from "node:assert/strict";

const B = process.env.API ?? "http://localhost:3001";

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json" },
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

assert.equal((await call("POST", "/boards", {})).status, 400);
assert.equal((await call("GET", "/boards/nao-existe")).status, 404);
assert.equal((await call("POST", "/columns/nao-existe/cards", { title: "x" })).status, 404);
assert.equal((await call("DELETE", `/cards/${c1.id}`)).status, 204);
assert.equal((await call("PATCH", `/cards/${c1.id}`, { title: "x" })).status, 404);

console.log("smoke ok");
