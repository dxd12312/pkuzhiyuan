import { notFound, redirect } from "next/navigation";
import SurveyShell from "@/components/survey-shell";
import { ComprehensionQuestion } from "@/components/comprehension-question";
import { getRespondentFromCookie } from "@/lib/session";
import { getBlockSequence } from "@/lib/mpl";
import type { CellId } from "@/lib/types";

const VALID_CELL_IDS: CellId[] = ["r1_low", "r1_high", "r4_low"];

// After each comprehension block, proceed to the next MPL block or /diagnostic.
// The block sequence controls which MPL block comes next; comprehension always
// sits between two consecutive blocks (or between last block and /diagnostic).
function resolveNextRoute(cellId: CellId, blockSequence: CellId[]): string {
  const idx = blockSequence.indexOf(cellId);
  if (idx === -1) return "/diagnostic";
  const nextBlock = blockSequence[idx + 1];
  return nextBlock ? `/block/${nextBlock}` : "/diagnostic";
}

interface Props {
  params: Promise<{ cellId: string }>;
}

export default async function ComprehensionPage({ params }: Props) {
  const { cellId } = await params;

  if (!VALID_CELL_IDS.includes(cellId as CellId)) {
    notFound();
  }

  const respondent = await getRespondentFromCookie();
  if (!respondent) {
    redirect("/");
  }

  const cell = cellId as CellId;
  const blockSequence = getBlockSequence(respondent.r1_block_order);
  // Comprehension step numbers follow the MPL blocks: block at index i is
  // step i+1; comprehension after it is step i+2 within the same block group.
  const blockIndex = blockSequence.indexOf(cell);
  // Use the MPL block count for totalSteps (each block + its comprehension).
  const totalSteps = blockSequence.length;
  const step = blockIndex + 1;

  const nextRoute = resolveNextRoute(cell, blockSequence);

  return (
    <SurveyShell step={step} totalSteps={totalSteps}>
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">理解性检验</h2>
        <p className="text-xs text-zinc-500">
          请根据刚才的选项回答下面的问题。
        </p>
        <ComprehensionQuestion cellId={cell} nextRoute={nextRoute} />
      </div>
    </SurveyShell>
  );
}
