import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { COOKIE_NAME } from "@/lib/constants";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const result = await getDb()
      .collection("respondents")
      .where({ respondent_id })
      .get();

    const respondent = (result as { data: unknown[] }).data[0];

    if (!respondent) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(respondent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
