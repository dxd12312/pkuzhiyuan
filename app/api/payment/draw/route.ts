import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import { drawLottery } from "@/lib/lottery";
import type { BlockResponse, Respondent } from "@/lib/types";
import type { Payment } from "@/lib/types";


export async function POST() {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    // Idempotency: return existing payment if already drawn
    const existing = await kvGet<Payment>(`payment:${respondent_id}`);
    if (existing) {
      return NextResponse.json(existing);
    }

    // Fetch respondent for rand_seed
    const respondent = await kvGet<Respondent>(`respondent:${respondent_id}`);
    if (!respondent) {
      return NextResponse.json({ error: "respondent_not_found" }, { status: 404 });
    }

    // Fetch the three block responses
    const [r1_low, r1_high, r4_low] = await Promise.all([
      kvGet<BlockResponse>(`response:${respondent_id}:r1_low`),
      kvGet<BlockResponse>(`response:${respondent_id}:r1_high`),
      kvGet<BlockResponse>(`response:${respondent_id}:r4_low`),
    ]);
    const responses = [r1_low, r1_high, r4_low].filter(Boolean) as BlockResponse[];

    const result = drawLottery(responses, respondent.rand_seed);

    const payment_id = crypto.randomUUID();
    const doc: Payment = {
      payment_id,
      respondent_id,
      fixed_amount: 10,
      ...result,
      drawn_at: new Date().toISOString(),
      is_submitted: false,
    };

    await kvPut(`payment:${respondent_id}`, doc);

    return NextResponse.json(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
