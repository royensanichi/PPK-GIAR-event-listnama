import type { Config, Context } from "@netlify/functions";
import crypto from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { members } from "../../db/schema.js";

const MAX_BODY = 4096;
const SESSION_MS = 8 * 60 * 60_000;
// Best-effort per-instance login throttling (serverless instances do not share memory).
const attempts = new Map<string, { failures: number; lockedUntil: number }>();

const adminPassword = () => process.env.ADMIN_PASSWORD || "giar";
const signingKey = () => crypto.createHash("sha256").update(`ppk-admin-session:${adminPassword()}`).digest();

function json(code: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
}

function sign(payload: string) {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("hex");
}

function createToken() {
  const payload = `${Date.now() + SESSION_MS}.${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

function isAuthenticated(req: Request) {
  const token = (req.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("ppk_admin="))?.slice(10);
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  if (!secureEqual(token.slice(i + 1), sign(payload))) return false;
  return Date.now() < Number(payload.split(".")[0]);
}

function secureEqual(a: string, b: string) {
  const aa = crypto.createHash("sha256").update(a).digest();
  const bb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(aa, bb);
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "Data terlalu panjang.");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "Format data tidak valid."); }
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export default async (req: Request, context: Context) => {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const secure = url.protocol === "https:" ? "; Secure" : "";

    if (pathname === "/api/members" && req.method === "GET") {
      const rows = await db.select({ id: members.id, name: members.name }).from(members).orderBy(asc(members.createdAt));
      return json(200, { members: rows });
    }

    if (pathname === "/api/members" && req.method === "POST") {
      const name = cleanName((await readJson(req)).name);
      if (name.length < 3 || name.length > 80 || /[<>\x00-\x1f\x7f]/.test(name)) {
        return json(400, { error: "Nama harus 3–80 karakter dan tidak boleh memakai simbol < atau >." });
      }
      const inserted = await db.insert(members).values({ name }).onConflictDoNothing().returning({ id: members.id });
      if (inserted.length === 0) return json(409, { error: "Nama tersebut sudah terdaftar." });
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
      return json(201, { message: "Pendaftaran berhasil!", count });
    }

    if (pathname === "/api/admin/login" && req.method === "POST") {
      const ip = context.ip || "unknown";
      const state = attempts.get(ip) || { failures: 0, lockedUntil: 0 };
      if (Date.now() < state.lockedUntil) return json(429, { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." });
      const body = await readJson(req);
      if (typeof body.password !== "string" || !secureEqual(body.password, adminPassword())) {
        state.failures++;
        if (state.failures >= 8) { state.lockedUntil = Date.now() + 5 * 60_000; state.failures = 0; }
        attempts.set(ip, state);
        return json(401, { error: "Password salah." });
      }
      attempts.delete(ip);
      return json(200, { message: "Login berhasil." }, {
        "Set-Cookie": `ppk_admin=${createToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`,
      });
    }

    if (pathname === "/api/admin/status" && req.method === "GET") {
      return json(200, { authenticated: isAuthenticated(req) });
    }

    if (pathname === "/api/admin/logout" && req.method === "POST") {
      return json(200, { message: "Logout berhasil." }, { "Set-Cookie": `ppk_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}` });
    }

    if (pathname.startsWith("/api/admin/members/") && req.method === "DELETE") {
      if (!isAuthenticated(req)) return json(401, { error: "Silakan login sebagai admin." });
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return json(403, { error: "Origin tidak diizinkan." });
      const id = decodeURIComponent(pathname.slice("/api/admin/members/".length));
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(404, { error: "Nama tidak ditemukan." });
      const deleted = await db.delete(members).where(eq(members.id, id)).returning({ id: members.id });
      if (deleted.length === 0) return json(404, { error: "Nama tidak ditemukan." });
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
      return json(200, { message: "Nama telah dihapus.", count });
    }

    return json(404, { error: "Endpoint tidak ditemukan." });
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: "Terjadi kesalahan pada server." });
  }
};

export const config: Config = {
  path: "/api/*",
};
