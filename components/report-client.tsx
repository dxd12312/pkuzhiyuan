"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "loading" | "streaming" | "done" | "error";

export function ReportClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const res = await fetch("/api/report/generate", { method: "POST" });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("无响应流");

        setPhase("streaming");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          setText((prev) => prev + chunk);
        }

        if (!cancelled) setPhase("done");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "生成失败，请刷新重试。");
          setPhase("error");
        }
      }
    }

    generate();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll while streaming
  useEffect(() => {
    if (phase === "streaming") {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [text, phase]);

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <SpinnerIcon />
        <p className="text-sm text-zinc-500">正在生成您的填报诊断报告…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col gap-4 py-8">
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {text}
          {phase === "streaming" && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-500" />
          )}
        </p>
        <div ref={endRef} />
      </div>

      {phase === "done" && (
        <button
          onClick={() => router.push("/payment")}
          className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          继续
        </button>
      )}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
