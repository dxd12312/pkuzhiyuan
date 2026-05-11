import { redirect } from "next/navigation";
import SurveyShell from "@/components/survey-shell";
import { DiagnosticForm } from "@/components/diagnostic-form";
import { getRespondentFromCookie } from "@/lib/session";
import { getQuestionsForVersion } from "@/lib/diagnostic";

export default async function DiagnosticPage() {
  const respondent = await getRespondentFromCookie();

  if (!respondent) {
    redirect("/error?code=no_session");
  }

  const questions = getQuestionsForVersion(respondent.version);

  return (
    <SurveyShell title="关于您的志愿填报">
      <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
        请回答以下问题，帮助我们更好地为您生成个性化报告。
      </p>
      <DiagnosticForm questions={questions} />
    </SurveyShell>
  );
}
