import { notFound, redirect } from "next/navigation";
import SurveyShell from "@/components/survey-shell";
import { MplBlockClient } from "@/components/mpl-block-client";
import { getRespondentFromCookie } from "@/lib/session";
import { getBlockSequence } from "@/lib/mpl";
import type { CellId } from "@/lib/types";

const VALID_CELL_IDS: CellId[] = ["r1_low", "r1_high", "r4_low"];

interface Props {
  params: Promise<{ cellId: string }>;
}

export default async function BlockPage({ params }: Props) {
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
  const step = blockSequence.indexOf(cell) + 1;
  const showHint = respondent.treatment_group === "treatment";

  return (
    <SurveyShell step={step} totalSteps={blockSequence.length}>
      <MplBlockClient cellId={cell} showHint={showHint} blockSequence={blockSequence} />
    </SurveyShell>
  );
}
