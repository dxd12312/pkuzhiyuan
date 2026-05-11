import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { toCsv } from "@/lib/csv";
import type { BlockResponse } from "@/lib/types";

const ADMIN_SESSION_COOKIE = "admin_session";
const PAGE_SIZE = 1000;

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

async function fetchAllResponses(): Promise<BlockResponse[]> {
  const db = getDb();
  const results: BlockResponse[] = [];
  let offset = 0;

  while (true) {
    const res = await db
      .collection("responses")
      .where({ record_type: "block" })
      .orderBy("page_entered_at", "asc")
      .skip(offset)
      .limit(PAGE_SIZE)
      .get();

    const page = (res.data ?? []) as BlockResponse[];
    results.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

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
