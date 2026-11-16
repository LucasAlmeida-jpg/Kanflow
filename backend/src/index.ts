import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
app.use(express.json());

const http = createServer(app);
const io = new Server(http, { cors: { origin: "*" } }); // ponytail: CORS aberto só em dev

app.get("/health", (_req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  console.log("conectou", socket.id);
});

const PORT = process.env.PORT ?? 3001;
http.listen(PORT, () => console.log(`http://localhost:${PORT}`));
