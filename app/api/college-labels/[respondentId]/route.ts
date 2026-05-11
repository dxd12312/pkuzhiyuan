import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
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

    const db = getDb();
    const result = await db
      .collection("college_labels")
      .where({ respondent_id: respondentId })
      .limit(1)
      .get();

    const doc = result.data?.[0];
    if (!doc) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    // Strip CloudBase internal fields
    const { _id, respondent_id: _rid, ...labels } = doc as Record<string, unknown>;
    void _id;
    void _rid;

    return NextResponse.json(labels);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
