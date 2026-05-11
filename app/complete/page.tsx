import SurveyShell from "@/components/survey-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getRespondentFromCookie } from "@/lib/session";
import { getDb } from "@/lib/cloudbase";

async function getTotalPayout(respondent_id: string): Promise<number | null> {
  try {
    const db = getDb();
    const result = await db
      .collection("payments")
      .where({ respondent_id })
      .get();
    const data = result.data as { total_payout?: number }[] | undefined;
    if (data && data.length > 0 && typeof data[0].total_payout === "number") {
      return data[0].total_payout;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function CompletePage() {
  const respondent = await getRespondentFromCookie();
  const totalPayout = respondent
    ? await getTotalPayout(respondent.respondent_id)
    : null;

  return (
    <SurveyShell title="实验完成">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-700 leading-relaxed">
          感谢您参与本次高考志愿选择行为研究！您的回答对我们的研究至关重要，我们将认真分析您的数据。
        </p>

        <Card className="border-zinc-200">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-zinc-800 mb-1">实验报酬</p>
            {totalPayout !== null ? (
              <p className="text-sm text-zinc-600 leading-relaxed">
                您的总报酬为 <span className="font-semibold text-zinc-900">¥{totalPayout.toFixed(2)}</span>，将在核实后发放至您填写的账号。
              </p>
            ) : (
              <p className="text-sm text-zinc-600 leading-relaxed">
                您的实验报酬将在核实后发放，具体金额由系统随机抽取的题目结果决定。请留意后续通知。
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-zinc-400 leading-relaxed mt-4 text-center">
          本次实验收集的数据仅用于学术研究，所有信息将严格保密，不会用于任何商业用途。
        </p>
      </div>
    </SurveyShell>
  );
}
