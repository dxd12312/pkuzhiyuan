import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll } from "@/lib/kv";
import { toCsv } from "@/lib/csv";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";

interface PaymentRecord {
  payment_id?: string;
  respondent_id: string;
  payment_method?: string;
  payment_account?: string;
  payee_name?: string;
  amount?: number;
  is_drawn?: boolean;
  drawn_at?: string;
  is_submitted?: boolean;
  submitted_at?: string;
  created_at?: string;
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

async function fetchAllPayments(): Promise<PaymentRecord[]> {
  const results = await kvGetAll<PaymentRecord>("payment:");
  results.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return results;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payments = await fetchAllPayments();

    const rows = payments.map((p) => ({
      payment_id: p.payment_id ?? "",
      respondent_id: p.respondent_id,
      payment_method: p.payment_method ?? "",
      payment_account: p.payment_account ?? "",
      payee_name: p.payee_name ?? "",
      amount: p.amount ?? "",
      is_drawn: p.is_drawn ?? "",
      drawn_at: p.drawn_at ?? "",
      is_submitted: p.is_submitted ?? "",
      submitted_at: p.submitted_at ?? "",
      created_at: p.created_at ?? "",
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
