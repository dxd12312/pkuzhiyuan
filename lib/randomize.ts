import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

export function generateRespondentId(): string {
  return uuidv4();
}

export function generateRandSeed(): string {
  return uuidv4().replace(/-/g, "").slice(0, 16);
}

export function assignTreatmentGroup(seed: string): "control" | "treatment" {
  const hash = createHash("sha256").update(seed + "_group").digest("hex");
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 2 === 0 ? "control" : "treatment";
}

export function assignBlockOrder(seed: string): "low_first" | "high_first" {
  const hash = createHash("sha256").update(seed + "_order").digest("hex");
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 2 === 0 ? "low_first" : "high_first";
}
