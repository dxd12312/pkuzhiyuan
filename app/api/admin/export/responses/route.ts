import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { toCsv } from "@/lib/csv";


const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sql = getSql();
    const responses = await sql`SELECT * FROM responses ORDER BY respondent_id, cell_id`;

    const rows = responses.map((r) => {
      const choices: string[] = Array.isArray(r.choices)
        ? r.choices
        : JSON.parse((r.choices as string) ?? "[]");
      return {
        response_id: r.response_id,
        respondent_id: r.respondent_id,
        cell_id: r.cell_id,
        presentation_order: r.presentation_order ?? "",
        choices: choices.join("|"),
        switching_point: r.switching_point,
        is_monotone: r.is_monotone,
        invalid_attempt_count: r.invalid_attempt_count,
        first_invalid_pattern: r.first_invalid_pattern ?? "",
        comp_answer: r.comp_answer ?? "",
        comp_correct: r.comp_correct ?? "",
        page_entered_at: r.page_entered_at,
        page_submitted_at: r.page_submitted_at ?? "",
      };
    });

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
