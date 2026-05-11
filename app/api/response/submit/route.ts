import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { validateSingleCrossing, getSwitchingPoint } from "@/lib/mpl";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId } from "@/lib/types";



export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { cell_id, choices, invalid_attempt_count, first_invalid_pattern } = body as {
      cell_id: CellId;
      choices: ("A" | "B")[];
      invalid_attempt_count: number;
      first_invalid_pattern?: string;
    };

    if (!Array.isArray(choices) || choices.length !== 7) {
      return NextResponse.json({ error: "choices must have exactly 7 elements" }, { status: 400 });
    }
    if (!choices.every((c) => c === "A" || c === "B")) {
      return NextResponse.json({ error: "choices must be A or B" }, { status: 400 });
    }
    if (!validateSingleCrossing(choices)) {
      return NextResponse.json({ error: "non_single_crossing" }, { status: 400 });
    }

    const switching_point = getSwitchingPoint(choices);
    const response_id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sql = getSql();

    await sql`
      INSERT INTO responses (
        response_id, respondent_id, cell_id, choices, switching_point,
        is_monotone, invalid_attempt_count, first_invalid_pattern,
        page_entered_at, page_submitted_at
      ) VALUES (
        ${response_id}, ${respondent_id}, ${cell_id},
        ${JSON.stringify(choices)}::jsonb, ${switching_point},
        ${true}, ${invalid_attempt_count}, ${first_invalid_pattern ?? null},
        ${now}, ${now}
      )
      ON CONFLICT (respondent_id, cell_id) DO UPDATE SET
        choices = EXCLUDED.choices,
        switching_point = EXCLUDED.switching_point,
        is_monotone = EXCLUDED.is_monotone,
        invalid_attempt_count = EXCLUDED.invalid_attempt_count,
        first_invalid_pattern = EXCLUDED.first_invalid_pattern,
        page_submitted_at = EXCLUDED.page_submitted_at
    `;

    await sql`
      UPDATE respondents
      SET current_page = current_page + 1
      WHERE respondent_id = ${respondent_id}
    `;

    return NextResponse.json({ success: true, response_id, switching_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
