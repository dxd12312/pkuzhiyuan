import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { COOKIE_NAME } from "@/lib/constants";
import type { Respondent } from "@/lib/types";

export async function getRespondentFromCookie(): Promise<Respondent | null> {
  const cookieStore = await cookies();
  const respondentId = cookieStore.get(COOKIE_NAME)?.value;

  if (!respondentId) return null;

  try {
    const db = getDb();
    const result = await db
      .collection("respondents")
      .where({ respondent_id: respondentId })
      .get();

    const data = result.data as Respondent[] | undefined;
    return data && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}
