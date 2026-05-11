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
    const payments = await sql`SELECT * FROM payments ORDER BY drawn_at`;

    const rows = payments.map((p) => ({
      payment_id: p.payment_id ?? "",
      respondent_id: p.respondent_id,
      fixed_amount: p.fixed_amount ?? "",
      lottery_block: p.lottery_block ?? "",
      lottery_row: p.lottery_row ?? "",
      lottery_choice: p.lottery_choice ?? "",
      lottery_payout: p.lottery_payout ?? "",
      comp_drawn_cell: p.comp_drawn_cell ?? "",
      comp_bonus: p.comp_bonus ?? "",
      total_payout: p.total_payout ?? "",
      drawn_at: p.drawn_at ?? "",
      is_submitted: p.is_submitted ?? "",
      payment_method: p.payment_method ?? "",
      payment_account: p.payment_account ?? "",
      payee_name: p.payee_name ?? "",
      submitted_at: p.submitted_at ?? "",
    }));

    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="payments_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
