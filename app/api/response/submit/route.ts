import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { validateSingleCrossing, getSwitchingPoint } from "@/lib/mpl";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId } from "@/lib/types";


export const runtime = 'edge';

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

    const doc = {
      response_id,
      respondent_id,
      record_type: "block" as const,
      cell_id,
      presentation_order: 0,
      choices,
      switching_point,
      is_monotone: true,
      invalid_attempt_count,
      ...(first_invalid_pattern && { first_invalid_pattern }),
      page_entered_at: new Date().toISOString(),
      page_submitted_at: new Date().toISOString(),
    };

    await kvPut(`response:${respondent_id}:${cell_id}`, doc);

    const existing = await kvGet<Record<string, unknown>>(`respondent:${respondent_id}`);
    if (existing) {
      const current_page = typeof existing.current_page === "number" ? existing.current_page : 0;
      await kvPut(`respondent:${respondent_id}`, { ...existing, current_page: current_page + 1 });
    }

    return NextResponse.json({ success: true, response_id, switching_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
