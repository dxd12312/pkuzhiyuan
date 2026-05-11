import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll } from "@/lib/kv";
import { toCsv } from "@/lib/csv";
import type { BlockResponse } from "@/lib/types";


const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

async function fetchAllResponses(): Promise<BlockResponse[]> {
  const results = await kvGetAll<BlockResponse>("response:");
  results.sort((a, b) => a.page_entered_at.localeCompare(b.page_entered_at));
  return results;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const responses = await fetchAllResponses();

    const rows = responses.map((r) => ({
      response_id: r.response_id,
      respondent_id: r.respondent_id,
      cell_id: r.cell_id,
      presentation_order: r.presentation_order,
      choices: r.choices.join("|"),
      switching_point: r.switching_point,
      is_monotone: r.is_monotone,
      invalid_attempt_count: r.invalid_attempt_count,
      first_invalid_pattern: r.first_invalid_pattern ?? "",
      comp_answer: r.comp_answer ?? "",
      comp_correct: r.comp_correct ?? "",
      page_entered_at: r.page_entered_at,
      page_submitted_at: r.page_submitted_at ?? "",
    }));

    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="responses_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
