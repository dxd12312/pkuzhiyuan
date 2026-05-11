import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import SurveyShell from "@/components/survey-shell";
import { COOKIE_NAME } from "@/lib/constants";

export default async function InstructionsPage() {
  const cookieStore = await cookies();
  const respondentId = cookieStore.get(COOKIE_NAME)?.value;

  if (!respondentId) {
    redirect("/");
  }

  return (
    <SurveyShell title="实验说明">
      <div className="flex flex-col gap-4 text-sm text-zinc-700 leading-relaxed">
        <p>
          本实验包含一系列选择题，每题请您在<strong>选项 A</strong> 和<strong>选项 B</strong> 之间做出选择。两个选项均涉及不同金额和概率的奖励，请根据您的真实偏好作答。
        </p>
        <p>
          实验分为若干组，每组包含多道选择题。题目从上到下依次呈现，请按顺序完成，不可跳过。每组完成后方可进入下一组。
        </p>
        <p>
          为保证数据质量，系统会对您的作答一致性进行检验。若检测到作答模式不一致，系统将提示您重新作答。请认真对待每一道题目，避免随意作答。
        </p>
        <p>
          实验完成后，您的报酬将根据系统随机抽取的一道题目结果进行发放。因此，每道题目均有可能影响您的实际报酬，请如实反映您的偏好。
        </p>
      </div>
      <div className="mt-8">
        <Link
          href="/block/r1_low"
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          开始实验
        </Link>
      </div>
    </SurveyShell>
  );
}
