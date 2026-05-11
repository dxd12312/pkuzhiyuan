import { redirect } from "next/navigation";
import SurveyShell from "@/components/survey-shell";
import PaymentClient from "@/components/payment-client";
import { getRespondentFromCookie } from "@/lib/session";

interface PaymentPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const respondent = await getRespondentFromCookie();
  if (!respondent) {
    redirect("/");
  }

  const params = await searchParams;
  const paymentHandled = params["payment_handled"] === "external";

  return (
    <SurveyShell title="实验报酬">
      <p className="text-sm text-zinc-600 leading-relaxed mb-4">
        实验已完成。以下是根据随机抽取结果计算的报酬，请填写收款信息以便发放。
      </p>
      <PaymentClient paymentHandled={paymentHandled} />
    </SurveyShell>
  );
}
