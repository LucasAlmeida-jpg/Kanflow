import express from "express";
import { createServer } from "node:http";
import { routes, onError } from "./routes.js";
import { io } from "./realtime.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(routes);
app.use(onError);

const http = createServer(app);
io.attach(http);

const PORT = process.env.PORT ?? 3001;
http.listen(PORT, () => console.log(`http://localhost:${PORT}`));
