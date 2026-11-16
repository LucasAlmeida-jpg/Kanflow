import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { routes, onError } from "./routes.js";

const app = express();
app.use(express.json());

const http = createServer(app);
const io = new Server(http, { cors: { origin: "*" } });

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(routes);
app.use(onError);

io.on("connection", (socket) => {
  console.log("conectou", socket.id);
});

const PORT = process.env.PORT ?? 3001;
http.listen(PORT, () => console.log(`http://localhost:${PORT}`));
