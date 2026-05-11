import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";

import type { DiagnosticAnswer } from "@/lib/diagnostic";


export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { answers } = body as { answers: DiagnosticAnswer };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers required" }, { status: 400 });
    }

    const doc = {
      diagnostic_id: crypto.randomUUID(),
      respondent_id,
      answers,
      submitted_at: new Date().toISOString(),
    };

    await kvPut(`diagnostic:${respondent_id}`, doc);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
