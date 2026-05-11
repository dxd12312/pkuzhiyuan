import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import type { Session } from "@/lib/types";


const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { session_id, is_active } = await req.json() as {
      session_id: string;
      is_active: boolean;
    };

    if (!session_id || typeof is_active !== "boolean") {
      return NextResponse.json({ error: "session_id and is_active required" }, { status: 400 });
    }

    const session = await kvGet<Session>(`session:${session_id}`);
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    await kvPut(`session:${session_id}`, { ...session, is_active });

    return NextResponse.json({ ok: true, session_id, is_active });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
