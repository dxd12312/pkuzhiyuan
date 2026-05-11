import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSql } from "@/lib/db";


const MAX_ATTEMPTS = 10;
const BLOCK_MINUTES = 15;

interface AdminRow {
  admin_id: string;
  username: string;
  password_hash: string;
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
  const sql = getSql();

  // Rate-limit check
  try {
    const rows = await sql`SELECT attempt_count, blocked_until FROM login_attempts WHERE ip_address = ${ip}`;
    if (rows.length > 0) {
      const row = rows[0];
      if (row.blocked_until && new Date(row.blocked_until as string) > new Date()) {
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
  let admin: AdminRow | null = null;
  try {
    const rows = await sql`SELECT admin_id, username, password_hash FROM admins WHERE username = ${username}`;
    admin = rows.length > 0 ? (rows[0] as AdminRow) : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!admin) {
    await recordAttempt(ip, BLOCK_MINUTES);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    await recordAttempt(ip, BLOCK_MINUTES);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  // Clear failed attempts on success
  try {
    await sql`DELETE FROM login_attempts WHERE ip_address = ${ip}`;
  } catch {
    // Non-fatal
  }

  // Update last_login_at
  try {
    await sql`UPDATE admins SET last_login_at = now() WHERE admin_id = ${admin.admin_id}`;
  } catch {
    // Non-fatal
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
  }

  const secretKey = new TextEncoder().encode(secret);
  const token = await new SignJWT({ admin_id: admin.admin_id, username: admin.username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secretKey);

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

async function recordAttempt(ip: string, blockMinutes: number): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO login_attempts (ip_address, attempt_count, first_attempt_at, blocked_until)
      VALUES (${ip}, ${1}, now(), null)
      ON CONFLICT (ip_address) DO UPDATE SET
        attempt_count = login_attempts.attempt_count + 1,
        blocked_until = CASE
          WHEN login_attempts.attempt_count + 1 >= ${MAX_ATTEMPTS}
          THEN now() + (${blockMinutes} || ' minutes')::interval
          ELSE null
        END
    `;
  } catch {
    // Non-fatal
  }
}
