import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { toCsv } from "@/lib/csv";
import type { Respondent } from "@/lib/types";

const ADMIN_SESSION_COOKIE = "admin_session";
const PAGE_SIZE = 1000;

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

async function fetchAllRespondents(): Promise<Respondent[]> {
  const db = getDb();
  const results: Respondent[] = [];
  let offset = 0;

  while (true) {
    const res = await db
      .collection("respondents")
      .orderBy("started_at", "asc")
      .skip(offset)
      .limit(PAGE_SIZE)
      .get();

    const page = (res.data ?? []) as Respondent[];
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
    const respondents = await fetchAllRespondents();

    // Flatten to plain objects, omit sensitive fields (ip_address, user_agent)
    const rows = respondents.map((r) => ({
      respondent_id: r.respondent_id,
      session_id: r.session_id,
      version: r.version,
      treatment_group: r.treatment_group,
      r1_block_order: r.r1_block_order,
      province: r.province,
      total_score: r.total_score ?? "",
      province_rank: r.province_rank ?? "",
      subject_track: r.subject_track,
      target_batch: r.target_batch ?? "",
      device_type: r.device_type,
      started_at: r.started_at,
      submitted_at: r.submitted_at ?? "",
      current_page: r.current_page,
      is_completed: r.is_completed,
      is_filtered: r.is_filtered,
    }));

    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="respondents_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
