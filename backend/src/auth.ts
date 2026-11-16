import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type RequestHandler, type Response } from "express";
import { db } from "./db.js";
import { limiter, rateLimit } from "./limit.js";
import { HttpError, text } from "./ops.js";
import { disconnectSession } from "./realtime.js";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const SESSION_DAYS = 30;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD = 200;

const loginByIp = limiter(100, 15 * 60_000);
const loginByEmail = limiter(10, 15 * 60_000);
const registerByIp = limiter(30, 60 * 60_000);
const emailKey = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const actual = await scryptAsync(password, Buffer.from(salt!, "hex"), 64);
  return timingSafeEqual(actual, Buffer.from(hash!, "hex"));
}

const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));

const sha256 = (token: string) => createHash("sha256").update(token).digest("hex");

const publicUser = (u: { id: string; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name });

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  return token;
}

export async function sessionFromToken(token: unknown) {
  if (typeof token !== "string" || !token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return { id: session.id, user: publicUser(session.user) };
}

const bearer = (header: string | undefined) => header?.match(/^Bearer (.+)$/)?.[1];

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await sessionFromToken(bearer(req.get("authorization")));
  if (!session) return res.status(401).json({ error: "não autenticado" });
  res.locals.user = session.user;
  res.locals.sessionId = session.id;
  next();
};

export const currentUser = (res: Response) => res.locals.user as { id: string; email: string; name: string };

export const authRoutes = Router();

authRoutes.post("/auth/register", rateLimit(registerByIp, (req) => req.ip ?? ""), async (req, res) => {
  const email = text(req.body?.email, "email", 254).toLowerCase();
  const name = text(req.body?.name, "name", 100);
  const password = req.body?.password;
  if (!EMAIL.test(email)) throw new HttpError(400, "email inválido");
  if (typeof password !== "string" || password.length < 8) throw new HttpError(400, "senha precisa ter 8 caracteres ou mais");
  if (password.length > MAX_PASSWORD) throw new HttpError(400, `senha pode ter no máximo ${MAX_PASSWORD} caracteres`);
  if (await db.user.findUnique({ where: { email } })) throw new HttpError(409, "email já cadastrado");

  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  res.status(201).json({ token: await createSession(user.id), user: publicUser(user) });
});

authRoutes.post(
  "/auth/login",
  rateLimit(loginByIp, (req) => req.ip ?? ""),
  rateLimit(loginByEmail, (req) => emailKey(req.body?.email)),
  async (req, res) => {
    const email = emailKey(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password.slice(0, MAX_PASSWORD) : "";
    const user = await db.user.findUnique({ where: { email } });
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, "email ou senha incorretos");
    res.json({ token: await createSession(user.id), user: publicUser(user) });
  },
);

authRoutes.post("/auth/logout", requireAuth, async (_req, res) => {
  const sessionId: string = res.locals.sessionId;
  await db.session.deleteMany({ where: { id: sessionId } });
  disconnectSession(sessionId);
  res.status(204).end();
});

authRoutes.get("/me", requireAuth, (_req, res) => {
  res.json(currentUser(res));
});
