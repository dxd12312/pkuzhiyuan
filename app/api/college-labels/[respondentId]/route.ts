import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { NEUTRAL_FALLBACKS } from "@/lib/colleges";


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ respondentId: string }> }
) {
  try {
    const { respondentId } = await params;

    if (!respondentId) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    const sql = getSql();
    const rows = await sql`
      SELECT * FROM college_labels WHERE respondent_id = ${respondentId}
    `;

    if (rows.length === 0) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    const { respondent_id: _rid, ...labels } = rows[0] as Record<string, unknown>;
    void _rid;

    return NextResponse.json(labels);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
