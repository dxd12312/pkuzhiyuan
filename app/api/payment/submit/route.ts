import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { Payment } from "@/lib/types";


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

    const payment = await kvGet<Payment>(`payment:${respondent_id}`);
    if (!payment) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    const updated: Payment = {
      ...payment,
      payment_method: method,
      payment_account: account,
      payee_name,
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    };

    await kvPut(`payment:${respondent_id}`, updated);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
