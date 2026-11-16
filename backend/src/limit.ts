import type { RequestHandler } from "express";

type Window = { count: number; resetAt: number };

export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, Window>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of hits) if (w.resetAt <= now) hits.delete(key);
  }, 60_000).unref();

  return function hit(key: string): number {
    const now = Date.now();
    let w = hits.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      hits.set(key, w);
    }
    w.count++;
    return w.count > max ? Math.ceil((w.resetAt - now) / 1000) : 0;
  };
}

export function rateLimit(hit: (key: string) => number, key: (req: Parameters<RequestHandler>[0]) => string): RequestHandler {
  return (req, res, next) => {
    const retryAfter = hit(key(req));
    if (!retryAfter) return next();
    res.set("retry-after", String(retryAfter));
    res.status(429).json({ error: "muitas tentativas, tente de novo mais tarde" });
  };
}
