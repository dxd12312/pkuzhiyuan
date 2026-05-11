import { getDb } from "@/lib/cloudbase";

export async function isAboveThreshold(
  province: string,
  subjectType: string,
  score: number
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .collection("score_thresholds")
    .where({ province, year: 2026, subject_type: subjectType })
    .get();
  if (!result.data || result.data.length === 0) return true; // no threshold = pass
  return score >= result.data[0].threshold_score;
}
