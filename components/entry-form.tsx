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
import { PROVINCES, SUBJECT_TRACKS } from "@/lib/constants";

interface EntryFormProps {
  sessionId: string;
}

export default function EntryForm({ sessionId }: EntryFormProps) {
  const router = useRouter();
  const [province, setProvince] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [subjectTrack, setSubjectTrack] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!province || !totalScore || !subjectTrack) {
      setError("请填写所有必填项");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/respondent/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          province,
          total_score: Number(totalScore),
          subject_track: subjectTrack,
        }),
      });

      const data = await res.json();

      if (res.ok && data.respondent_id) {
        router.push("/instructions");
      } else if (data.filtered) {
        router.push("/error/network");
      } else {
        setError(data.message || "提交失败，请重试");
      }
    } catch {
      router.push("/error/network");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="province">所在省份</Label>
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
        <Label htmlFor="total_score">高考总分</Label>
        <Input
          id="total_score"
          type="number"
          inputMode="numeric"
          placeholder="请输入您的高考总分"
          value={totalScore}
          onChange={(e) => setTotalScore(e.target.value)}
          min={0}
          max={900}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>科目类别</Label>
        <RadioGroup value={subjectTrack} onValueChange={setSubjectTrack} className="gap-2">
          {SUBJECT_TRACKS.map((track) => (
            <div key={track.value} className="flex items-center gap-2">
              <RadioGroupItem value={track.value} id={`track_${track.value}`} />
              <Label htmlFor={`track_${track.value}`} className="font-normal cursor-pointer">
                {track.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? "提交中..." : "下一步"}
      </Button>
    </form>
  );
}
