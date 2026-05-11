import { kvGet } from "@/lib/kv";

export async function isAboveThreshold(
  province: string,
  subjectType: string,
  score: number
): Promise<boolean> {
  const key = `score_threshold:${province}:2026:${subjectType}`;
  const threshold = await kvGet<{ threshold_score: number }>(key);
  if (!threshold) return true;
  return score >= threshold.threshold_score;
}
