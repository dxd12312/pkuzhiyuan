"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MplTable } from "@/components/mpl-table";
import { MPL_ROWS, getSwitchingPoint } from "@/lib/mpl";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId } from "@/lib/types";
import type { CollegeLabels } from "@/lib/colleges";

interface MplBlockClientProps {
  cellId: CellId;
  showHint: boolean;
  blockSequence: CellId[];
}

function getRespondentId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? match.split("=")[1] : null;
}

export function MplBlockClient({ cellId, showHint }: MplBlockClientProps) {
  // After each block go to its comprehension page; the comprehension page
  // then routes to the next block (or /diagnostic for the last block).
  const nextRoute = `/comprehension/${cellId}`;
  const router = useRouter();
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [collegeLabels, setCollegeLabels] = useState<CollegeLabels | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [invalidAttemptCount, setInvalidAttemptCount] = useState(0);
  const [firstInvalidPattern, setFirstInvalidPattern] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const rid = getRespondentId();
    setRespondentId(rid);

    if (!rid) return;

    fetch(`/api/college-labels/${rid}`)
      .then((r) => r.json())
      .then((data: CollegeLabels) => {
        if (data && !("error" in data)) setCollegeLabels(data);
      })
      .catch(() => {
        // Non-fatal: table falls back to generic labels
      });
  }, []);

  async function handleSubmit(choices: ("A" | "B")[]) {
    setSubmitting(true);
    setSubmitError(null);

    const switchingPoint = getSwitchingPoint(choices);

    try {
      const res = await fetch("/api/response/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cell_id: cellId,
          choices,
          respondent_id: respondentId,
          switching_point: switchingPoint,
          is_monotone: true, // only reachable if validateSingleCrossing passed
          invalid_attempt_count: invalidAttemptCount,
          ...(firstInvalidPattern
            ? { first_invalid_pattern: firstInvalidPattern }
            : {}),
          page_submitted_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      router.push(nextRoute);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "提交失败，请重试。"
      );
      setSubmitting(false);
    }
  }

  // Called by MplTable when the user hits submit but validation fails.
  // We intercept via a wrapper so the table remains the single validator.
  function handleInvalidAttempt(pattern: string) {
    setInvalidAttemptCount((n) => n + 1);
    if (!firstInvalidPattern) setFirstInvalidPattern(pattern);
  }

  return (
    <div className="min-h-screen bg-background">
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-card px-6 py-4 text-sm text-foreground shadow-lg">
            正在提交…
          </div>
        </div>
      )}

      {submitError && (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        </div>
      )}

      <MplTable
        cellId={cellId}
        rows={MPL_ROWS}
        showHint={showHint}
        onSubmit={handleSubmit}
        onInvalidAttempt={handleInvalidAttempt}
        collegeLabels={collegeLabels}
      />
    </div>
  );
}
