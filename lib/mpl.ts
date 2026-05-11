import type { CellId, MplRow } from "./types";

export const MPL_ROWS: MplRow[] = [
  { row: 1, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 30, probability: 0.25 } },
  { row: 2, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 35, probability: 0.25 } },
  { row: 3, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 40, probability: 0.25 } },
  { row: 4, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 45, probability: 0.25 } },
  { row: 5, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 50, probability: 0.25 } },
  { row: 6, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 55, probability: 0.25 } },
  { row: 7, optionA: { amount: 25, probability: 0.5 }, optionB: { amount: 60, probability: 0.25 } },
];

export const TREATMENT_HINTS: Record<CellId, string> = {
  r1_low: "如果你选择院校X，你的预期收益为：19.7375元。",
  r1_high: "如果你选择院校X，你的预期收益为：20.00元。",
  r4_low: "未达线后的平均金额：5.00元。",
};

export function validateSingleCrossing(choices: ("A" | "B")[]): boolean {
  let switched = false;
  for (let i = 1; i < choices.length; i++) {
    if (choices[i - 1] === "B" && choices[i] === "A") return false;
    if (choices[i - 1] === "A" && choices[i] === "B") {
      if (switched) return false;
      switched = true;
    }
  }
  return true;
}

export function getSwitchingPoint(choices: ("A" | "B")[]): number {
  const firstB = choices.indexOf("B");
  return firstB === -1 ? 0 : firstB;
}

export function getBlockSequence(order: "low_first" | "high_first"): CellId[] {
  return order === "low_first"
    ? ["r1_low", "r1_high", "r4_low"]
    : ["r1_high", "r1_low", "r4_low"];
}
