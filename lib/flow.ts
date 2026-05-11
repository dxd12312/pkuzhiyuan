import type { CellId } from "./types";

// ---------------------------------------------------------------------------
// Block sequence helper (mirrors mpl.ts — duplicated here to keep flow.ts
// importable in both Edge and Node runtimes without pulling in mpl.ts)
// ---------------------------------------------------------------------------
function getBlockSequence(order: "low_first" | "high_first"): CellId[] {
  return order === "low_first"
    ? ["r1_low", "r1_high", "r4_low"]
    : ["r1_high", "r1_low", "r4_low"];
}

// ---------------------------------------------------------------------------
// Step types (ordered)
// ---------------------------------------------------------------------------
export type StepType =
  | "entry"
  | "instructions"
  | "block"
  | "comprehension"
  | "diagnostic"
  | "report"
  | "payment"
  | "complete";

export const FLOW_STEPS: StepType[] = [
  "entry",
  "instructions",
  "block",       // ×3 interleaved with comprehension
  "comprehension",
  "block",
  "comprehension",
  "block",
  "comprehension",
  "diagnostic",
  "report",
  "payment",
  "complete",
];

// ---------------------------------------------------------------------------
// Respondent shape required by flow helpers (subset of full Respondent)
// ---------------------------------------------------------------------------
export interface FlowRespondent {
  r1_block_order: "low_first" | "high_first";
  version: "gaokao_senior" | "rising_senior";
}

// ---------------------------------------------------------------------------
// Route pattern matchers
// ---------------------------------------------------------------------------
function matchBlock(route: string): CellId | null {
  const m = route.match(/^\/block\/([^/]+)/);
  return m ? (m[1] as CellId) : null;
}

function matchComprehension(route: string): CellId | null {
  const m = route.match(/^\/comprehension\/([^/]+)/);
  return m ? (m[1] as CellId) : null;
}

function matchEntry(route: string): boolean {
  return /^\/s\/[^/]+/.test(route);
}

// ---------------------------------------------------------------------------
// getNextRoute
// Returns the URL of the next step given the current route and respondent.
// ---------------------------------------------------------------------------
export function getNextRoute(
  currentRoute: string,
  respondent: FlowRespondent
): string {
  const seq = getBlockSequence(respondent.r1_block_order);
  // [0] = first block, [1] = second, [2] = third (always r4_low)

  // Entry → Instructions
  if (matchEntry(currentRoute)) return "/instructions";

  // Instructions → first block
  if (currentRoute === "/instructions") return `/block/${seq[0]}`;

  // Block → Comprehension for same block
  const blockCell = matchBlock(currentRoute);
  if (blockCell) return `/comprehension/${blockCell}`;

  // Comprehension → next block or diagnostic
  const compCell = matchComprehension(currentRoute);
  if (compCell) {
    const idx = seq.indexOf(compCell);
    if (idx === -1) return "/diagnostic"; // unknown — fall through
    if (idx < seq.length - 1) return `/block/${seq[idx + 1]}`;
    return "/diagnostic"; // all three blocks done
  }

  if (currentRoute === "/diagnostic") return "/report";
  if (currentRoute === "/report") return "/payment";
  if (currentRoute === "/payment") return "/complete";
  if (currentRoute === "/complete") return "/complete"; // terminal

  return "/";
}

// ---------------------------------------------------------------------------
// getPreviousRoute (for back navigation — best-effort)
// ---------------------------------------------------------------------------
export function getPreviousRoute(
  currentRoute: string,
  respondent: FlowRespondent
): string {
  const seq = getBlockSequence(respondent.r1_block_order);

  if (currentRoute === "/instructions") return "/"; // back to entry root
  if (currentRoute === `/block/${seq[0]}`) return "/instructions";

  const blockCell = matchBlock(currentRoute);
  if (blockCell) {
    const idx = seq.indexOf(blockCell);
    if (idx <= 0) return "/instructions";
    return `/comprehension/${seq[idx - 1]}`;
  }

  const compCell = matchComprehension(currentRoute);
  if (compCell) return `/block/${compCell}`;

  if (currentRoute === "/diagnostic") {
    return `/comprehension/${seq[seq.length - 1]}`;
  }
  if (currentRoute === "/report") return "/diagnostic";
  if (currentRoute === "/payment") return "/report";
  if (currentRoute === "/complete") return "/payment";

  return "/";
}

// ---------------------------------------------------------------------------
// Step index helpers (for progress bar)
// Flat ordered list: entry(0) instructions(1) block×3+comp×3 diag report payment complete
// Total = 12 positions (0-indexed), but we expose 1-based to UI
// ---------------------------------------------------------------------------
const TOTAL_STEPS = 11; // entry excluded from progress bar; 10 remaining steps

/**
 * Returns 1-based step number for progress bar (entry page excluded).
 * Returns 0 when on the entry page (no progress bar shown).
 */
export function getCurrentStep(
  route: string,
  respondent: FlowRespondent
): number {
  const seq = getBlockSequence(respondent.r1_block_order);

  if (matchEntry(route)) return 0; // entry: no bar

  if (route === "/instructions") return 1;

  // blocks at positions 2, 4, 6
  const blockCell = matchBlock(route);
  if (blockCell) {
    const idx = seq.indexOf(blockCell);
    return 2 + idx * 2; // 2, 4, 6
  }

  // comprehensions at positions 3, 5, 7
  const compCell = matchComprehension(route);
  if (compCell) {
    const idx = seq.indexOf(compCell);
    return 3 + idx * 2; // 3, 5, 7
  }

  if (route === "/diagnostic") return 8;
  if (route === "/report") return 9;
  if (route === "/payment") return 10;
  if (route === "/complete") return 11;

  return 0;
}

export function getTotalSteps(): number {
  return TOTAL_STEPS;
}
