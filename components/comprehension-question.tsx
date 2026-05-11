"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CellId } from "@/lib/types";

const OPTIONS = ["0", "5", "10", "15", "20", "25"] as const;
type OptionValue = (typeof OPTIONS)[number];

interface ComprehensionQuestionProps {
  cellId: CellId;
  nextRoute: string;
}

export function ComprehensionQuestion({
  cellId,
  nextRoute,
}: ComprehensionQuestionProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<OptionValue | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/comprehension/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cell_id: cellId, answer: selected }),
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

  return (
    <div className="rounded-lg border border-zinc-200 bg-card p-5 space-y-5">
      <p className="text-sm font-medium text-zinc-800 leading-relaxed">
        在刚才的选择中，如果您始终选择院校X，您的预期收益是多少？
      </p>

      <RadioGroup
        value={selected}
        onValueChange={(v) => setSelected(v as OptionValue)}
        className="grid grid-cols-2 gap-3"
      >
        {OPTIONS.map((opt) => {
          const id = `comp-opt-${opt}`;
          return (
            <div
              key={opt}
              className={`flex items-center gap-2 rounded-md border px-4 py-3 cursor-pointer transition-colors ${
                selected === opt
                  ? "border-primary bg-primary/5"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
              onClick={() => setSelected(opt)}
            >
              <RadioGroupItem value={opt} id={id} />
              <Label htmlFor={id} className="cursor-pointer text-sm">
                {opt}元
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {submitError && (
        <p className="text-xs text-destructive">{submitError}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="w-full"
      >
        {submitting ? "提交中…" : "确认并继续"}
      </Button>
    </div>
  );
}
