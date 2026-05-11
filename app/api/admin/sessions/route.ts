import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll, kvPut } from "@/lib/kv";
import type { Session } from "@/lib/types";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";
const BASE_URL = "https://www.pkuzhiyuan.com";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await kvGetAll<Session>("session:");
    sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
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

    const session_id = generateSessionId();
    const entry_url = `${BASE_URL}/s/${session_id}`;
    const created_at = new Date().toISOString();

    const session: Session = {
      session_id,
      province,
      school_name: school_name ?? "",
      version,
      college_preset: college_preset ?? [],
      score_threshold,
      created_by: "admin",
      created_at,
      is_active: true,
      entry_url,
    };

    await kvPut(`session:${session_id}`, session);

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
