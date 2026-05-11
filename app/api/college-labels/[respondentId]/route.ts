import { NextRequest, NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
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

    const doc = await kvGet<Record<string, unknown>>(`college_labels:${respondentId}`);
    if (!doc) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    const { respondent_id: _rid, ...labels } = doc;
    void _rid;

    return NextResponse.json(labels);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
