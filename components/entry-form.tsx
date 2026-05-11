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

interface SessionData {
  province?: string;
  school_name?: string;
  college_preset?: string[];
}

interface EntryFormProps {
  sessionId: string;
  version?: "gaokao_senior" | "rising_senior";
  sessionData?: SessionData;
}

export default function EntryForm({
  sessionId,
  version = "gaokao_senior",
  sessionData,
}: EntryFormProps) {
  const router = useRouter();

  // gaokao_senior fields
  const [province, setProvince] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [subjectTrack, setSubjectTrack] = useState("");
  const [collegeX, setCollegeX] = useState(sessionData?.college_preset?.[0] ?? "");
  const [collegeY, setCollegeY] = useState(sessionData?.college_preset?.[1] ?? "");

  // rising_senior fields
  const [classId, setClassId] = useState("");
  const [studentSeq, setStudentSeq] = useState("");
  const [risingSubjectTrack, setRisingSubjectTrack] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (version === "gaokao_senior") {
      if (!province || !totalScore || !subjectTrack) {
        setError("请填写所有必填项");
        return;
      }
    } else {
      if (!classId || !studentSeq || !risingSubjectTrack) {
        setError("请填写班级、学生编号和科目类别");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const payload =
        version === "gaokao_senior"
          ? {
              session_id: sessionId,
              version,
              province,
              total_score: Number(totalScore),
              subject_track: subjectTrack,
              colleges: [collegeX, collegeY].filter(Boolean),
            }
          : {
              session_id: sessionId,
              version,
              province: sessionData?.province ?? "",
              subject_track: risingSubjectTrack,
              class_id: classId,
              student_seq: studentSeq,
            };

      const res = await fetch("/api/respondent/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (version === "rising_senior") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {sessionData?.province && (
          <div className="flex flex-col gap-1.5">
            <Label>所在省份</Label>
            <p className="text-sm text-muted-foreground rounded-md border px-3 py-2 bg-muted">
              {sessionData.province}
            </p>
          </div>
        )}

        {sessionData?.school_name && (
          <div className="flex flex-col gap-1.5">
            <Label>所在学校</Label>
            <p className="text-sm text-muted-foreground rounded-md border px-3 py-2 bg-muted">
              {sessionData.school_name}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="class_id">班级</Label>
          <Input
            id="class_id"
            type="text"
            placeholder="如：高三(1)班"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student_seq">学生编号</Label>
          <Input
            id="student_seq"
            type="text"
            placeholder="请输入您的学生编号"
            value={studentSeq}
            onChange={(e) => setStudentSeq(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>科目类别</Label>
          <RadioGroup
            value={risingSubjectTrack}
            onValueChange={setRisingSubjectTrack}
            className="gap-2"
          >
            {SUBJECT_TRACKS.map((track) => (
              <div key={track.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={track.value}
                  id={`rising_track_${track.value}`}
                />
                <Label
                  htmlFor={`rising_track_${track.value}`}
                  className="font-normal cursor-pointer"
                >
                  {track.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "提交中..." : "下一步"}
        </Button>
      </form>
    );
  }

  // gaokao_senior (default)
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="college_x">您最想去的大学（院校 X）</Label>
        <Input
          id="college_x"
          type="text"
          placeholder="如：北京大学（选填）"
          value={collegeX}
          onChange={(e) => setCollegeX(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="college_y">您的保底大学（院校 Y）</Label>
        <Input
          id="college_y"
          type="text"
          placeholder="如：南京大学（选填）"
          value={collegeY}
          onChange={(e) => setCollegeY(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? "提交中..." : "下一步"}
      </Button>
    </form>
  );
}
