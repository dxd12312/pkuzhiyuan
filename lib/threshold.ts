import { getSql } from "@/lib/db";

export async function isAboveThreshold(
  province: string,
  subjectType: string,
  score: number
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT threshold_score FROM score_thresholds
    WHERE province = ${province} AND year = 2026 AND subject_type = ${subjectType}
  `;
  if (rows.length === 0) return true;
  const threshold = rows[0] as { threshold_score: number };
  return score >= threshold.threshold_score;
}
