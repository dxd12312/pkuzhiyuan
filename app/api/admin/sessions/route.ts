import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import type { Session } from "@/lib/types";


const ADMIN_SESSION_COOKIE = "admin_session";
const BASE_URL = "https://www.pkuzhiyuan.com";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM sessions ORDER BY created_at DESC`;
    const sessions = rows.map((r) => ({
      ...r,
      college_preset: Array.isArray(r.college_preset)
        ? r.college_preset
        : JSON.parse((r.college_preset as string) ?? "[]"),
    })) as Session[];
    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      province: string;
      school_name?: string;
      version: "gaokao_senior" | "rising_senior";
      college_preset?: string[];
      score_threshold?: number;
    };

    const { province, school_name, version, college_preset, score_threshold } = body;

    if (!province || !version) {
      return NextResponse.json({ error: "province and version are required" }, { status: 400 });
    }

    const session_id = crypto.randomUUID();
    const entry_url = `${BASE_URL}/s/${session_id}`;
    const preset = college_preset ?? [];

    const sql = getSql();
    await sql`
      INSERT INTO sessions (session_id, province, school_name, version, college_preset, score_threshold, created_by, is_active, entry_url)
      VALUES (
        ${session_id}, ${province}, ${school_name ?? ""},
        ${version}, ${JSON.stringify(preset)}::jsonb,
        ${score_threshold ?? null}, ${"admin"}, ${true}, ${entry_url}
      )
    `;

    const rows = await sql`SELECT * FROM sessions WHERE session_id = ${session_id}`;
    const session = {
      ...rows[0],
      college_preset: Array.isArray(rows[0].college_preset)
        ? rows[0].college_preset
        : JSON.parse((rows[0].college_preset as string) ?? "[]"),
    } as Session;

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
