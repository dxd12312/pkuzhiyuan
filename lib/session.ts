import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/constants";
import type { Respondent } from "@/lib/types";

export async function getRespondentFromCookie(): Promise<Respondent | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;
  if (!id) return null;
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM respondents WHERE respondent_id = ${id}`;
    if (rows.length === 0) return null;
    return rows[0] as Respondent;
  } catch {
    return null;
  }
}
