import { notFound } from "next/navigation";
import SurveyShell from "@/components/survey-shell";
import { MplBlockClient } from "@/components/mpl-block-client";
import type { CellId } from "@/lib/types";

const VALID_CELL_IDS: CellId[] = ["r1_low", "r1_high", "r4_low"];
const CELL_STEP: Record<CellId, number> = {
  r1_low: 1,
  r1_high: 2,
  r4_low: 3,
};

interface Props {
  params: Promise<{ cellId: string }>;
}

export default async function BlockPage({ params }: Props) {
  const { cellId } = await params;

  if (!VALID_CELL_IDS.includes(cellId as CellId)) {
    notFound();
  }

  const cell = cellId as CellId;
  const step = CELL_STEP[cell];

  return (
    <SurveyShell step={step} totalSteps={3}>
      {/* showHint driven by treatment group — MVP defaults to false */}
      <MplBlockClient cellId={cell} showHint={false} />
    </SurveyShell>
  );
}
