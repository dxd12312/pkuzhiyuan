"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Session } from "@/lib/types";

interface AdminSessionListProps {
  sessions: Session[];
}

export default function AdminSessionList({ sessions: initial }: AdminSessionListProps) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [toggling, setToggling] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleToggle(session: Session) {
    setToggling(session.session_id);
    try {
      const res = await fetch("/api/admin/sessions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          is_active: !session.is_active,
        }),
      });

      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === session.session_id
              ? { ...s, is_active: !s.is_active }
              : s
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleCopy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          暂无场次，点击右上角「创建新场次」开始
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">场次列表（共 {sessions.length} 个）</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">省份</th>
                <th className="px-4 py-3 text-left font-medium">学校</th>
                <th className="px-4 py-3 text-left font-medium">版本</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">创建时间</th>
                <th className="px-4 py-3 text-left font-medium">入口链接</th>
                <th className="px-4 py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => (
                <tr
                  key={s.session_id}
                  className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-3">{s.province}</td>
                  <td className="px-4 py-3">{s.school_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs">
                      {s.version === "gaokao_senior" ? "高考生" : "准高三"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.is_active ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[200px] truncate text-xs text-muted-foreground font-mono">
                        {s.entry_url}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleCopy(s.entry_url, s.session_id)}
                      >
                        {copied === s.session_id ? "已复制" : "复制"}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={s.is_active ? "destructive" : "outline"}
                      className="h-7 px-3 text-xs"
                      disabled={toggling === s.session_id}
                      onClick={() => handleToggle(s)}
                    >
                      {toggling === s.session_id
                        ? "处理中..."
                        : s.is_active
                        ? "停用"
                        : "启用"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
