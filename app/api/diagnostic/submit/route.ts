import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
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

    const diagnostic_id = crypto.randomUUID();
    const submitted_at = new Date().toISOString();

    const sql = getSql();
    await sql`
      INSERT INTO diagnostic_responses (diagnostic_id, respondent_id, answers, submitted_at)
      VALUES (
        ${diagnostic_id}, ${respondent_id},
        ${JSON.stringify(answers)}::jsonb, ${submitted_at}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
