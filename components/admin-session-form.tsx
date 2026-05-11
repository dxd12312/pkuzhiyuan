"use client";

import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVINCES } from "@/lib/constants";

export default function AdminSessionForm() {
  const router = useRouter();
  const [province, setProvince] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [version, setVersion] = useState<"gaokao_senior" | "rising_senior">("gaokao_senior");
  const [collegePreset, setCollegePreset] = useState("");
  const [scoreThreshold, setScoreThreshold] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!province) {
      setError("请选择省份");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province,
          school_name: schoolName || undefined,
          version,
          college_preset: collegePreset
            ? collegePreset.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          score_threshold: scoreThreshold ? Number(scoreThreshold) : undefined,
        }),
      });

      if (res.ok) {
        router.push("/admin/sessions");
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "创建失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>创建新场次</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="province">省份 *</Label>
            <Select value={province} onValueChange={(v: string | null) => setProvince(v ?? "")}>
              <SelectTrigger id="province">
                <SelectValue placeholder="请选择省份" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school_name">学校名称</Label>
            <Input
              id="school_name"
              type="text"
              placeholder="如：北京四中（选填）"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>问卷版本 *</Label>
            <RadioGroup
              value={version}
              onValueChange={(v) => setVersion(v as typeof version)}
              className="gap-3"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="gaokao_senior" id="v_gaokao" />
                <Label htmlFor="v_gaokao" className="font-normal cursor-pointer">
                  高考生（已参加高考）
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="rising_senior" id="v_rising" />
                <Label htmlFor="v_rising" className="font-normal cursor-pointer">
                  准高三（即将参加高考）
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="college_preset">预设志愿院校</Label>
            <Input
              id="college_preset"
              type="text"
              placeholder="多所院校用英文逗号分隔，如：北京大学,清华大学（选填）"
              value={collegePreset}
              onChange={(e) => setCollegePreset(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              填写后受访者入口页将预填这些院校
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="score_threshold">分数线筛选阈值</Label>
            <Input
              id="score_threshold"
              type="number"
              inputMode="numeric"
              placeholder="低于此分数将被过滤（选填）"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(e.target.value)}
              min={0}
              max={900}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建场次"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/sessions")}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
