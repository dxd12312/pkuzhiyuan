import { createHash } from "crypto";
import type { BlockResponse, CellId } from "./types";
import { MPL_ROWS } from "./mpl";

const CELL_IDS: CellId[] = ["r1_low", "r1_high", "r4_low"];

// Comprehension questions matching the 3 blocks
const COMP_QUESTIONS = [
  { cell_id: "r1_low" as CellId, label: "r1_low 理解题" },
  { cell_id: "r1_high" as CellId, label: "r1_high 理解题" },
  { cell_id: "r4_low" as CellId, label: "r4_low 理解题" },
];

export interface LotteryResult {
  lottery_block: CellId;
  lottery_row: number; // 1-indexed
  lottery_choice: "A" | "B";
  lottery_payout: number;
  comp_drawn_cell: CellId;
  comp_bonus: number;
  total_payout: number;
}

function deterministicInt(seed: string, salt: string, max: number): number {
  const hash = createHash("sha256").update(seed + salt).digest("hex");
  return parseInt(hash.slice(0, 8), 16) % max;
}

/**
 * Compute the expected value of a chosen option as the actual payout.
 * Option A: 25 yuan at 50% → expected 12.5 yuan
 * Option B: varies at 25% → expected = amount * 0.25
 *
 * For lottery payout we pay the *expected value* of the chosen option,
 * not a probabilistic draw — this is standard for MPL incentive design.
 */
function computePayout(choice: "A" | "B", rowIndex: number): number {
  const row = MPL_ROWS[rowIndex];
  if (!row) return 0;
  if (choice === "A") {
    return row.optionA.amount * row.optionA.probability;
  }
  return row.optionB.amount * row.optionB.probability;
}

export function drawLottery(
  responses: BlockResponse[],
  seed: string
): LotteryResult {
  // Draw 1 of 3 blocks
  const blockIdx = deterministicInt(seed, "_lottery_block", 3);
  const lottery_block = CELL_IDS[blockIdx];

  // Draw 1 of 7 rows (0-indexed internally, 1-indexed in display)
  const rowIdx = deterministicInt(seed, "_lottery_row", 7);
  const lottery_row = rowIdx + 1;

  // Look up the respondent's choice in that block/row
  const blockResponse = responses.find((r) => r.cell_id === lottery_block);
  const lottery_choice: "A" | "B" = blockResponse?.choices?.[rowIdx] ?? "A";
  const lottery_payout = computePayout(lottery_choice, rowIdx);

  // Draw comprehension question
  const compIdx = deterministicInt(seed, "_comp_draw", 3);
  const comp_drawn_cell = COMP_QUESTIONS[compIdx].cell_id;

  // Look up comp result for the drawn cell
  const compResponse = responses.find((r) => r.cell_id === comp_drawn_cell);
  const comp_bonus = compResponse?.comp_correct === true ? 1 : 0;

  const total_payout = 10 + lottery_payout + comp_bonus;

  return {
    lottery_block,
    lottery_row,
    lottery_choice,
    lottery_payout,
    comp_drawn_cell,
    comp_bonus,
    total_payout,
  };
}
