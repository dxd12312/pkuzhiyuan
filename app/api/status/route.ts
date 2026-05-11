import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";

export async function GET() {
  try {
    await getDb().collection("respondents").count();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      db_connected: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
