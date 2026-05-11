export function generateRespondentId(): string {
  return crypto.randomUUID();
}

export function generateRandSeed(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function assignTreatmentGroup(seed: string): Promise<"control" | "treatment"> {
  const hash = await sha256hex(seed + "_group");
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 2 === 0 ? "control" : "treatment";
}

export async function assignBlockOrder(seed: string): Promise<"low_first" | "high_first"> {
  const hash = await sha256hex(seed + "_order");
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 2 === 0 ? "low_first" : "high_first";
}
