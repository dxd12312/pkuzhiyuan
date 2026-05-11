import { redirect } from "next/navigation";
import { getRespondentFromCookie } from "@/lib/session";
import SurveyShell from "@/components/survey-shell";
import { ReportClient } from "@/components/report-client";

export default async function ReportPage() {
  const respondent = await getRespondentFromCookie();
  if (!respondent) {
    redirect("/");
  }

  return (
    <SurveyShell title="填报准备画像">
      <p className="mb-4 text-sm text-zinc-500 leading-relaxed">
        根据您的实验数据和问卷回答，系统正在为您生成个性化诊断报告。
      </p>
      <ReportClient />
    </SurveyShell>
  );
}
