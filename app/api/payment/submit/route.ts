import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
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

    const db = getDb();
    await db
      .collection("payments")
      .where({ respondent_id })
      .update({
        payment_method: method,
        payment_account: account,
        payee_name,
        is_submitted: true,
        submitted_at: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
