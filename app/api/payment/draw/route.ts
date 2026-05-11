import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
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

    const sql = getSql();

    // Idempotency: return existing payment if already drawn
    const existingRows = await sql`SELECT * FROM payments WHERE respondent_id = ${respondent_id}`;
    if (existingRows.length > 0) {
      return NextResponse.json(existingRows[0]);
    }

    // Fetch respondent for rand_seed
    const respondentRows = await sql`SELECT * FROM respondents WHERE respondent_id = ${respondent_id}`;
    if (respondentRows.length === 0) {
      return NextResponse.json({ error: "respondent_not_found" }, { status: 404 });
    }
    const respondent = respondentRows[0] as Respondent;

    // Fetch the three block responses
    const responseRows = await sql`SELECT * FROM responses WHERE respondent_id = ${respondent_id}`;
    const responses = responseRows.map((r) => ({
      ...r,
      choices: Array.isArray(r.choices) ? r.choices : JSON.parse(r.choices as string),
    })) as BlockResponse[];

    const result = drawLottery(responses, respondent.rand_seed);

    const payment_id = crypto.randomUUID();
    const drawn_at = new Date().toISOString();

    await sql`
      INSERT INTO payments (
        payment_id, respondent_id, fixed_amount,
        lottery_block, lottery_row, lottery_choice, lottery_payout,
        comp_drawn_cell, comp_bonus, total_payout,
        drawn_at, is_submitted
      ) VALUES (
        ${payment_id}, ${respondent_id}, ${10},
        ${result.lottery_block}, ${result.lottery_row}, ${result.lottery_choice}, ${result.lottery_payout},
        ${result.comp_drawn_cell}, ${result.comp_bonus}, ${result.total_payout},
        ${drawn_at}, ${false}
      )
    `;

    const doc: Payment = {
      payment_id,
      respondent_id,
      fixed_amount: 10,
      ...result,
      drawn_at,
      is_submitted: false,
    };

    return NextResponse.json(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
