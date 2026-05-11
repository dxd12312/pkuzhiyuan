import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/cloudbase";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Admin {
  admin_id: string;
  username: string;
  password_hash: string;
}

interface LoginAttempt {
  ip: string;
  count: number;
  window_start: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const db = getDb();

  // Rate-limit check
  try {
    const attemptResult = await db
      .collection("login_attempts")
      .where({ ip })
      .limit(1)
      .get();

    const record = (attemptResult.data?.[0] ?? null) as LoginAttempt | null;
    if (record) {
      const windowStart = new Date(record.window_start).getTime();
      const now = Date.now();
      if (now - windowStart < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
      }
    }
  } catch {
    // Non-fatal: proceed without rate-limit if DB unavailable
  }

  // Parse body
  let username: string;
  let password: string;
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    username = (body.username ?? "").trim();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  // Lookup admin
  let admin: Admin | null = null;
  try {
    const result = await db
      .collection("admins")
      .where({ username })
      .limit(1)
      .get();
    admin = (result.data?.[0] ?? null) as Admin | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!admin) {
    await recordAttempt(db, ip);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    await recordAttempt(db, ip);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  // Clear failed attempts on success
  try {
    await db.collection("login_attempts").where({ ip }).remove();
  } catch {
    // Non-fatal
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
  }

  const token = jwt.sign(
    { admin_id: admin.admin_id, username: admin.username },
    secret,
    { expiresIn: "24h" }
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  return response;
}

async function recordAttempt(
  db: ReturnType<typeof getDb>,
  ip: string
): Promise<void> {
  try {
    const result = await db
      .collection("login_attempts")
      .where({ ip })
      .limit(1)
      .get();
    const record = (result.data?.[0] ?? null) as LoginAttempt | null;
    const now = new Date().toISOString();
    if (record) {
      await db
        .collection("login_attempts")
        .where({ ip })
        .update({ count: db.command.inc(1) });
    } else {
      await db.collection("login_attempts").add({ ip, count: 1, window_start: now });
    }
  } catch {
    // Non-fatal
  }
}
