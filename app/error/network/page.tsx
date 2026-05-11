import Link from "next/link";
import SurveyShell from "@/components/survey-shell";

export default function NetworkErrorPage() {
  return (
    <SurveyShell>
      <div className="flex flex-col items-center gap-6 text-center pt-8">
        <div className="text-4xl text-zinc-300">&#9888;</div>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-zinc-800">网络连接异常</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            网络连接异常，请稍后再试
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-full max-w-xs items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          返回
        </Link>
      </div>
    </SurveyShell>
  );
}
