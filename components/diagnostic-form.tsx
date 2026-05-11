"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { DiagnosticQuestion, DiagnosticAnswer } from "@/lib/diagnostic";

interface DiagnosticFormProps {
  questions: DiagnosticQuestion[];
}

export function DiagnosticForm({ questions }: DiagnosticFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<DiagnosticAnswer>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      router.push("/report");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提交失败，请重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {submitError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {questions.map((q, idx) => (
        <Card key={q.id} className="border-zinc-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-zinc-800 mb-3">
              {idx + 1}. {q.text}
            </p>

            {q.type === "single_choice" && q.options && (
              <RadioGroup
                value={answers[q.id] ?? ""}
                onValueChange={(v) => setAnswer(q.id, v)}
                className="flex flex-col gap-2"
              >
                {q.options.map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label
                      htmlFor={`${q.id}-${opt}`}
                      className="text-sm text-zinc-700 cursor-pointer"
                    >
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === "likert" && q.options && q.likertLabels && (
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                  <span>{q.likertLabels.min}</span>
                  <span>{q.likertLabels.max}</span>
                </div>
                <RadioGroup
                  value={answers[q.id] ?? ""}
                  onValueChange={(v) => setAnswer(q.id, v)}
                  className="flex flex-row justify-between"
                >
                  {q.options.map((opt) => (
                    <div key={opt} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      <Label
                        htmlFor={`${q.id}-${opt}`}
                        className="text-xs text-zinc-500 cursor-pointer"
                      >
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full mt-2"
      >
        {submitting ? "提交中…" : "提交"}
      </Button>

      {!allAnswered && (
        <p className="text-xs text-zinc-400 text-center">请回答所有问题后提交</p>
      )}
    </div>
  );
}
