"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportTarget = "respondents" | "responses" | "payments";

interface ExportButtonProps {
  target: ExportTarget;
  label: string;
  filename: string;
}

function ExportButton({ target, label, filename }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/export/${target}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={loading} variant="outline">
        {loading ? "导出中..." : label}
      </Button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}

interface AdminExportProps {
  respondentCount: number;
  responseCount: number;
  paymentCount: number;
}

export function AdminExport({
  respondentCount,
  responseCount,
  paymentCount,
}: AdminExportProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">受访者数据</p>
          <p className="text-sm text-muted-foreground">{respondentCount} 条记录</p>
        </div>
        <ExportButton
          target="respondents"
          label="导出受访者数据"
          filename="respondents_export.csv"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">作答数据</p>
          <p className="text-sm text-muted-foreground">{responseCount} 条记录</p>
        </div>
        <ExportButton
          target="responses"
          label="导出作答数据"
          filename="responses_export.csv"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">支付数据</p>
          <p className="text-sm text-muted-foreground">{paymentCount} 条记录</p>
        </div>
        <ExportButton
          target="payments"
          label="导出支付数据"
          filename="payments_export.csv"
        />
      </div>
    </div>
  );
}
