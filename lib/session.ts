import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { Respondent } from "@/lib/types";

export async function getRespondentFromCookie(): Promise<Respondent | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;
  if (!id) return null;
  try {
    return await kvGet<Respondent>(`respondent:${id}`);
  } catch {
    return null;
  }
}
