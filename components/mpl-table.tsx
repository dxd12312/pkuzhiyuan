"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { validateSingleCrossing, TREATMENT_HINTS } from "@/lib/mpl";
import type { CellId, MplRow } from "@/lib/types";
import type { CollegeLabels } from "@/lib/colleges";

interface MplTableProps {
  cellId: CellId;
  rows: MplRow[];
  showHint: boolean;
  onSubmit: (choices: ("A" | "B")[]) => void;
  onInvalidAttempt?: (pattern: string) => void;
  collegeLabels?: CollegeLabels;
}

const CELL_LABEL: Record<CellId, string> = {
  r1_low: "第一志愿（低分段）",
  r1_high: "第一志愿（高分段）",
  r4_low: "第四志愿（低分段）",
};

export function MplTable({ cellId, rows, showHint, onSubmit, onInvalidAttempt, collegeLabels }: MplTableProps) {
  const labelX = collegeLabels?.college_x_display ?? "院校 X";
  const labelY = collegeLabels?.college_y_display ?? "院校 Y";
  const [choices, setChoices] = useState<("A" | "B" | null)[]>(
    Array(rows.length).fill(null)
  );
  const [error, setError] = useState<string | null>(null);
  const [invalidRows, setInvalidRows] = useState<number[]>([]);

  function setChoice(rowIndex: number, value: "A" | "B") {
    setChoices((prev) => {
      const next = [...prev];
      next[rowIndex] = value;
      return next;
    });
    // Clear error on any change
    setError(null);
    setInvalidRows([]);
  }

  function handleSubmit() {
    // Check all rows filled
    if (choices.some((c) => c === null)) {
      setError("请完成所有行的选择后再提交。");
      return;
    }

    const filled = choices as ("A" | "B")[];

    if (!validateSingleCrossing(filled)) {
      // Find the offending rows: any B→A reversal
      const bad: number[] = [];
      let seenB = false;
      for (let i = 0; i < filled.length; i++) {
        if (filled[i] === "B") seenB = true;
        if (seenB && filled[i] === "A") bad.push(i);
      }
      setInvalidRows(bad);
      setError(
        "请确保您的选择满足单一换点要求（从A切换到B后不能再切回A）"
      );
      onInvalidAttempt?.(filled.join(""));
      return;
    }

    onSubmit(filled);
  }

  const allSelected = choices.every((c) => c !== null);

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto px-4 py-6">
      {/* Hint box */}
      {showHint && (
        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          {TREATMENT_HINTS[cellId]}
        </div>
      )}

      {/* Context info */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-medium text-foreground">
            当前区块：{CELL_LABEL[cellId]}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            请在每一行中选择您更倾向的选项（A 或 B）。
          </p>
        </CardContent>
      </Card>

      {/* Choice table */}
      <div className="flex flex-col gap-1">
        {/* Header */}
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span className="w-8 shrink-0 text-center">行</span>
          <span className="flex-1 text-center">选项 A（{labelX}）</span>
          <span className="flex-1 text-center">选项 B（{labelY}）</span>
        </div>

        {/* Data rows */}
        {rows.map((row, idx) => {
          const isInvalid = invalidRows.includes(idx);
          const choiceA = choices[idx] === "A";
          const choiceB = choices[idx] === "B";

          return (
            <div
              key={row.row}
              className={cn(
                "flex items-center gap-2 rounded-md border bg-card px-2 transition-colors",
                isInvalid && "border-l-4 border-l-red-500 border-red-200"
              )}
            >
              {/* Row number */}
              <span className="w-8 shrink-0 text-center text-sm text-muted-foreground font-mono">
                {row.row}
              </span>

              {/* Option A */}
              <label
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 min-h-12 cursor-pointer rounded px-2 py-2 text-sm",
                  choiceA && "bg-primary/10 font-medium text-primary"
                )}
              >
                <input
                  type="radio"
                  name={`row-${idx}`}
                  value="A"
                  checked={choiceA}
                  onChange={() => setChoice(idx, "A")}
                  className="accent-primary"
                />
                <span>
                  ¥{row.optionA.amount}，概率{row.optionA.probability * 100}%
                </span>
              </label>

              {/* Option B */}
              <label
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 min-h-12 cursor-pointer rounded px-2 py-2 text-sm",
                  choiceB && "bg-primary/10 font-medium text-primary"
                )}
              >
                <input
                  type="radio"
                  name={`row-${idx}`}
                  value="B"
                  checked={choiceB}
                  onChange={() => setChoice(idx, "B")}
                  className="accent-primary"
                />
                <span>
                  ¥{row.optionB.amount}，概率{row.optionB.probability * 100}%
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Validation error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!allSelected}
        className="w-full"
        size="lg"
      >
        提交选择
      </Button>
    </div>
  );
}
