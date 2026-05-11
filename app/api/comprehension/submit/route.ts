import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId } from "@/lib/types";


// Numeric value each option label represents (in 元).
const OPTION_VALUES: Record<string, number> = {
  "0": 0,
  "5": 5,
  "10": 10,
  "15": 15,
  "20": 20,
  "25": 25,
};

// Correct answers per cell: the option string that is closest to the true EV.
const CORRECT_ANSWERS: Record<CellId, string> = {
  r1_low: "20",   // EV = 19.7375
  r1_high: "20",  // EV = 20.00
  r4_low: "5",    // EV = 5.00
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { cell_id, answer } = body as { cell_id: CellId; answer: string };

    if (!cell_id || !(cell_id in CORRECT_ANSWERS)) {
      return NextResponse.json({ error: "invalid cell_id" }, { status: 400 });
    }

    if (!(answer in OPTION_VALUES)) {
      return NextResponse.json({ error: "invalid answer" }, { status: 400 });
    }

    const comp_correct = answer === CORRECT_ANSWERS[cell_id];

    const sql = getSql();
    await sql`
      UPDATE responses
      SET comp_answer = ${answer}, comp_correct = ${comp_correct}
      WHERE respondent_id = ${respondent_id} AND cell_id = ${cell_id}
    `;

    return NextResponse.json({ success: true, correct: comp_correct });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
