"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface LotteryResult {
  fixed_amount: number;
  lottery_payout: number;
  comp_bonus: number;
  total_payout: number;
}

interface PaymentClientProps {
  paymentHandled: boolean;
}

export default function PaymentClient({ paymentHandled }: PaymentClientProps) {
  const router = useRouter();

  const [result, setResult] = useState<LotteryResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [method, setMethod] = useState<string>("");
  const [account, setAccount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payment/draw", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
        } else {
          setResult(data as LotteryResult);
        }
      })
      .catch(() => setLoadError("网络错误，请刷新重试"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method || !account.trim() || !payeeName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          account: account.trim(),
          payee_name: payeeName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/complete");
      } else {
        setSubmitError(data.error ?? "提交失败，请重试");
      }
    } catch {
      setSubmitError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Payout summary */}
      <Card className="border-zinc-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-semibold text-zinc-800 mb-3">实验报酬明细</p>
          {loadError ? (
            <p className="text-sm text-red-500">{loadError}</p>
          ) : result === null ? (
            <p className="text-sm text-zinc-400">正在计算报酬…</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>固定报酬</span>
                <span>¥{result.fixed_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>实验抽奖</span>
                <span>¥{result.lottery_payout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>理解题奖励</span>
                <span>¥{result.comp_bonus.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-900 border-t border-zinc-200 pt-2 mt-1">
                <span>总计</span>
                <span>¥{result.total_payout.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment form */}
      {!paymentHandled && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="method">收款方式</Label>
            <Select onValueChange={(v: string | null) => setMethod(v ?? "")} value={method}>
              <SelectTrigger id="method">
                <SelectValue placeholder="请选择收款方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="支付宝">支付宝</SelectItem>
                <SelectItem value="微信">微信</SelectItem>
                <SelectItem value="话费充值">话费充值</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account">
              {method === "话费充值" ? "手机号" : "账号/手机号"}
            </Label>
            <Input
              id="account"
              type="text"
              inputMode="numeric"
              placeholder={method === "话费充值" ? "请输入手机号" : "请输入账号或手机号"}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payee-name">真实姓名</Label>
            <Input
              id="payee-name"
              type="text"
              placeholder="请输入真实姓名，用于核实到账"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              required
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}

          <Button
            type="submit"
            disabled={submitting || !method || !account.trim() || !payeeName.trim()}
            className="w-full"
          >
            {submitting ? "提交中…" : "确认提交"}
          </Button>
        </form>
      )}

      {paymentHandled && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 leading-relaxed">
            报酬将通过实验组织方另行发放，无需在此填写收款信息。
          </p>
          <Button className="w-full" onClick={() => router.push("/complete")}>
            完成实验
          </Button>
        </div>
      )}
    </div>
  );
}
