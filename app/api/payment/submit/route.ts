import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/constants";


export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { method, account, payee_name } = body as {
      method: "支付宝" | "微信" | "话费充值";
      account: string;
      payee_name: string;
    };

    if (!method || !account || !payee_name) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const sql = getSql();

    const existing = await sql`SELECT payment_id FROM payments WHERE respondent_id = ${respondent_id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    await sql`
      UPDATE payments
      SET payment_method = ${method},
          payment_account = ${account},
          payee_name = ${payee_name},
          is_submitted = true,
          submitted_at = now()
      WHERE respondent_id = ${respondent_id}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
