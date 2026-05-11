import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { COOKIE_NAME } from "@/lib/constants";
import { drawLottery } from "@/lib/lottery";
import type { BlockResponse, Respondent } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const db = getDb();

    // Idempotency: return existing payment if already drawn
    const existing = await db
      .collection("payments")
      .where({ respondent_id })
      .get();

    const existingData = existing.data as Record<string, unknown>[] | undefined;
    if (existingData && existingData.length > 0) {
      return NextResponse.json(existingData[0]);
    }

    // Fetch respondent for rand_seed
    const rRes = await db
      .collection("respondents")
      .where({ respondent_id })
      .get();
    const respondents = rRes.data as Respondent[] | undefined;
    if (!respondents || respondents.length === 0) {
      return NextResponse.json({ error: "respondent_not_found" }, { status: 404 });
    }
    const respondent = respondents[0];

    // Fetch all block responses
    const bRes = await db
      .collection("responses")
      .where({ respondent_id, record_type: "block" })
      .get();
    const responses = (bRes.data ?? []) as BlockResponse[];

    const result = drawLottery(responses, respondent.rand_seed);

    const payment_id = uuidv4();
    const doc = {
      payment_id,
      respondent_id,
      fixed_amount: 10,
      ...result,
      drawn_at: new Date().toISOString(),
      is_submitted: false,
    };

    await db.collection("payments").add(doc);

    return NextResponse.json(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
