# Survey UI Redesign — Academic Professional Look

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the survey pages to look like a credible PKU academic experiment platform — clean, trustworthy, mobile-first.

**Architecture:** All visual changes are confined to CSS variables, two components (`survey-shell.tsx`, `entry-form.tsx`), and three page files (`app/page.tsx`, `app/instructions/page.tsx`, `app/complete/page.tsx`). No lib/, API route, or data-layer file is touched. The design tokens (brand colors, spacing) are defined once in `globals.css` as CSS custom properties so every file inherits them consistently.

**Tech Stack:** Next.js 16, Tailwind CSS v4 (utility-first with `@theme inline`), shadcn/ui components (button, card, input, label, select, radio-group), inline SVG for the checkmark icon.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `app/globals.css` | Modify | Brand color tokens (PKU blue/maroon), warm-gray background, card shadow utility, focus ring, body font-size/line-height |
| `components/survey-shell.tsx` | Modify | Top accent bar, header with logo text + badge, segmented progress, card wrapper, footer |
| `app/page.tsx` | Modify | University branding card, maroon accent title, better subtitle, rounded-full CTA button |
| `components/entry-form.tsx` | Modify | Section title + divider, card wrapper, card-style radio options, full-width selects, helper text on college fields |
| `app/instructions/page.tsx` | Modify | Section header, numbered steps in circles, highlighted key terms, prominent CTA button |
| `app/complete/page.tsx` | Modify | Inline SVG checkmark, reward summary in highlighted card, professional thank-you message |

---

## Task 1: Design tokens in `globals.css`

**Files:**
- Modify: `app/globals.css`

No test needed — visual-only CSS. Verify with `npm run build` at the end of the plan.

- [ ] **Step 1: Add PKU brand color tokens and body defaults**

Replace the `:root { ... }` block. Keep all existing tokens; add the new ones at the bottom of `:root` and add the `@layer base` body overrides:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);

  /* PKU brand tokens */
  --pku-blue: #1a56db;
  --pku-blue-light: #e8f0fe;
  --pku-maroon: #8b1a1a;
  --pku-page-bg: #f8f7f5;
  --pku-card-shadow: 0 1px 4px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
}
```

- [ ] **Step 2: Update `@layer base` to apply warm-gray background, font size, and line-height**

Replace the existing `@layer base` block:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply text-foreground antialiased;
    background-color: var(--pku-page-bg);
    font-size: 16px;
    line-height: 1.75;
  }
  html {
    @apply font-sans;
  }
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [data-slot="select-trigger"]:focus-visible {
    outline: 2px solid var(--pku-blue);
    outline-offset: 1px;
  }
  input[type="radio"]:checked {
    accent-color: var(--pku-blue);
  }
}
```

- [ ] **Step 3: Verify the file looks correct**

Run a quick syntax check:
```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors (CSS is not checked by tsc, this just confirms no TS was accidentally broken).

---

## Task 2: Redesign `components/survey-shell.tsx`

**Files:**
- Modify: `components/survey-shell.tsx`

- [ ] **Step 1: Rewrite survey-shell with accent bar, header, segmented progress, card wrapper, footer**

Full replacement of the file content:

```tsx
interface SurveyShellProps {
  title?: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}

export default function SurveyShell({
  title,
  step,
  totalSteps,
  children,
}: SurveyShellProps) {
  const hasProgress =
    step !== undefined && totalSteps !== undefined && totalSteps > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--pku-page-bg)" }}>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: "var(--pku-blue)" }} />

      {/* Header */}
      <header className="w-full max-w-lg mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-base font-semibold tracking-wide"
              style={{ color: "var(--pku-maroon)" }}
            >
              北京大学智愿研究
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "var(--pku-blue-light)",
                color: "var(--pku-blue)",
              }}
            >
              PKU
            </span>
          </div>
          {hasProgress && (
            <span className="text-xs text-zinc-400">
              {step} / {totalSteps}
            </span>
          )}
        </div>

        {/* Segmented progress bar */}
        {hasProgress && (
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalSteps! }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    i < step!
                      ? "var(--pku-blue)"
                      : "oklch(0.922 0 0)",
                }}
              />
            ))}
          </div>
        )}
      </header>

      {/* Main content card */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 pb-8">
        <div
          className="rounded-xl bg-white px-5 py-6"
          style={{ boxShadow: "var(--pku-card-shadow)" }}
        >
          {title && (
            <h1 className="text-lg font-semibold text-zinc-900 mb-5 pb-4 border-b border-zinc-100">
              {title}
            </h1>
          )}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto px-5 pb-6 text-center">
        <p className="text-xs text-zinc-400">
          本研究由北京大学经济学院主持，数据仅用于学术研究
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add app/globals.css components/survey-shell.tsx && git commit -m "feat(ui): add PKU brand tokens and redesign survey-shell"
```

---

## Task 3: Redesign `app/page.tsx` (landing page)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite the landing page with PKU branding**

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="flex flex-1 items-center justify-center min-h-screen px-5 py-10"
      style={{ backgroundColor: "var(--pku-page-bg)" }}
    >
      {/* Top accent bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1"
        style={{ backgroundColor: "var(--pku-blue)" }}
      />

      <div
        className="w-full max-w-sm rounded-xl bg-white px-6 py-8 text-center"
        style={{ boxShadow: "var(--pku-card-shadow)" }}
      >
        {/* Institution badge */}
        <div className="flex justify-center mb-4">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: "var(--pku-blue-light)",
              color: "var(--pku-blue)",
            }}
          >
            北京大学经济学院
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold mb-2 leading-snug"
          style={{ color: "var(--pku-maroon)" }}
        >
          高考志愿选择行为研究
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          本研究由北京大学经济学院主持，旨在了解高考考生的志愿填报决策行为
        </p>

        {/* CTA */}
        <Link
          href="/s/demo"
          className="inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "var(--pku-blue)" }}
        >
          进入演示
        </Link>

        <p className="text-xs text-zinc-400 mt-4">
          数据仅用于学术研究，严格保密
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add app/page.tsx && git commit -m "feat(ui): redesign landing page with PKU branding"
```

---

## Task 4: Redesign `components/entry-form.tsx`

**Files:**
- Modify: `components/entry-form.tsx`

The logic (state, handlers, API call) is unchanged. Only JSX structure and classNames change. The card wrapper is added by `SurveyShell`, so the form itself just needs better internal layout: section heading, divider, card-style radio buttons, full-width selects, helper text.

- [ ] **Step 1: Update the `rising_senior` form branch JSX**

Replace the JSX returned by the `if (version === "rising_senior")` block (lines 113–186). The `"use client"` directive, all imports, state declarations, and `handleSubmit` function are UNCHANGED — only the `return` statements change.

```tsx
  if (version === "rising_senior") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--pku-blue)" }}
          >
            1
          </span>
          <span className="text-sm font-medium text-zinc-500">基本信息</span>
        </div>
        <div className="h-px bg-zinc-100 -mt-2 mb-1" />

        {sessionData?.province && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-zinc-700">所在省份</Label>
            <p className="text-sm text-zinc-500 rounded-lg border border-zinc-200 px-3 py-2 bg-zinc-50">
              {sessionData.province}
            </p>
          </div>
        )}

        {sessionData?.school_name && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-zinc-700">所在学校</Label>
            <p className="text-sm text-zinc-500 rounded-lg border border-zinc-200 px-3 py-2 bg-zinc-50">
              {sessionData.school_name}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="class_id" className="text-sm font-medium text-zinc-700">
            班级
          </Label>
          <Input
            id="class_id"
            type="text"
            placeholder="如：高三(1)班"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student_seq" className="text-sm font-medium text-zinc-700">
            学生编号
          </Label>
          <Input
            id="student_seq"
            type="text"
            placeholder="请输入您的学生编号"
            value={studentSeq}
            onChange={(e) => setStudentSeq(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-zinc-700">科目类别</Label>
          <RadioGroup
            value={risingSubjectTrack}
            onValueChange={setRisingSubjectTrack}
            className="gap-2"
          >
            {SUBJECT_TRACKS.map((track) => (
              <label
                key={track.value}
                htmlFor={`rising_track_${track.value}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 cursor-pointer transition-colors"
                style={
                  risingSubjectTrack === track.value
                    ? {
                        borderColor: "var(--pku-blue)",
                        backgroundColor: "var(--pku-blue-light)",
                      }
                    : {}
                }
              >
                <RadioGroupItem
                  value={track.value}
                  id={`rising_track_${track.value}`}
                />
                <span className="text-sm text-zinc-700">{track.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--pku-blue)", minHeight: "44px" }}
        >
          {loading ? "提交中..." : "下一步"}
        </button>
      </form>
    );
  }
```

- [ ] **Step 2: Update the `gaokao_senior` form branch JSX**

Replace the final `return` block (the default gaokao_senior form, lines 189–263):

```tsx
  // gaokao_senior (default)
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-flex w-5 h-5 rounded-full text-white text-xs font-bold items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--pku-blue)" }}
        >
          1
        </span>
        <span className="text-sm font-medium text-zinc-500">基本信息</span>
      </div>
      <div className="h-px bg-zinc-100 -mt-2 mb-1" />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="province" className="text-sm font-medium text-zinc-700">
          所在省份
        </Label>
        <Select value={province} onValueChange={(v: string | null) => setProvince(v ?? "")}>
          <SelectTrigger id="province" className="w-full">
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
        <Label htmlFor="total_score" className="text-sm font-medium text-zinc-700">
          高考总分
        </Label>
        <Input
          id="total_score"
          type="number"
          inputMode="numeric"
          placeholder="请输入您的高考总分（0–900）"
          value={totalScore}
          onChange={(e) => setTotalScore(e.target.value)}
          min={0}
          max={900}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-zinc-700">科目类别</Label>
        <RadioGroup value={subjectTrack} onValueChange={setSubjectTrack} className="gap-2">
          {SUBJECT_TRACKS.map((track) => (
            <label
              key={track.value}
              htmlFor={`track_${track.value}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 cursor-pointer transition-colors"
              style={
                subjectTrack === track.value
                  ? {
                      borderColor: "var(--pku-blue)",
                      backgroundColor: "var(--pku-blue-light)",
                    }
                  : {}
              }
            >
              <RadioGroupItem value={track.value} id={`track_${track.value}`} />
              <span className="text-sm text-zinc-700">{track.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="college_x" className="text-sm font-medium text-zinc-700">
          您最想去的大学（院校 X）
        </Label>
        <Input
          id="college_x"
          type="text"
          placeholder="如：北京大学（选填）"
          value={collegeX}
          onChange={(e) => setCollegeX(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-zinc-400">填写您的第一志愿目标院校，可不填</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="college_y" className="text-sm font-medium text-zinc-700">
          您的保底大学（院校 Y）
        </Label>
        <Input
          id="college_y"
          type="text"
          placeholder="如：南京大学（选填）"
          value={collegeY}
          onChange={(e) => setCollegeY(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-zinc-400">填写您有较大把握录取的院校，可不填</p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--pku-blue)", minHeight: "44px" }}
      >
        {loading ? "提交中..." : "下一步"}
      </button>
    </form>
  );
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add components/entry-form.tsx && git commit -m "feat(ui): redesign entry-form with card-style radio options and helper text"
```

---

## Task 5: Redesign `app/instructions/page.tsx`

**Files:**
- Modify: `app/instructions/page.tsx`

- [ ] **Step 1: Rewrite instructions page with numbered steps in circles and prominent CTA**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import SurveyShell from "@/components/survey-shell";
import { getRespondentFromCookie } from "@/lib/session";
import { getBlockSequence } from "@/lib/mpl";

const STEPS = [
  {
    text: "本实验包含一系列选择题，每题请您在",
    highlight: "选项 A 和选项 B",
    rest: "之间做出选择。两个选项均涉及不同金额和概率的奖励，请根据您的真实偏好作答。",
  },
  {
    text: "实验分为若干组，每组包含多道选择题。题目从上到下依次呈现，请",
    highlight: "按顺序完成，不可跳过",
    rest: "。每组完成后方可进入下一组。",
  },
  {
    text: "为保证数据质量，系统会对您的作答",
    highlight: "一致性进行检验",
    rest: "。若检测到作答模式不一致，系统将提示您重新作答。请认真对待每一道题目，避免随意作答。",
  },
  {
    text: "实验完成后，您的报酬将根据系统",
    highlight: "随机抽取的一道题目",
    rest: "结果进行发放。因此，每道题目均有可能影响您的实际报酬，请如实反映您的偏好。",
  },
];

export default async function InstructionsPage() {
  const respondent = await getRespondentFromCookie();

  if (!respondent) {
    redirect("/");
  }

  const firstBlock = getBlockSequence(respondent.r1_block_order)[0];

  return (
    <SurveyShell title="实验说明">
      <ol className="flex flex-col gap-5">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span
              className="inline-flex w-7 h-7 rounded-full text-white text-xs font-bold items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "var(--pku-blue)" }}
            >
              {i + 1}
            </span>
            <p className="text-sm text-zinc-700 leading-relaxed">
              {s.text}
              <span
                className="font-semibold px-1 rounded"
                style={{
                  backgroundColor: "var(--pku-blue-light)",
                  color: "var(--pku-blue)",
                }}
              >
                {s.highlight}
              </span>
              {s.rest}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <Link
          href={`/block/${firstBlock}`}
          className="inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "var(--pku-blue)", minHeight: "44px" }}
        >
          开始实验
        </Link>
      </div>
    </SurveyShell>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add app/instructions/page.tsx && git commit -m "feat(ui): redesign instructions page with numbered steps"
```

---

## Task 6: Redesign `app/complete/page.tsx`

**Files:**
- Modify: `app/complete/page.tsx`

- [ ] **Step 1: Rewrite complete page with inline SVG checkmark and highlighted reward card**

```tsx
import SurveyShell from "@/components/survey-shell";
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
      <div className="flex flex-col items-center gap-6">
        {/* Inline SVG checkmark */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--pku-blue-light)" }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 16.5L13 22.5L25 10"
              stroke="var(--pku-blue)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Thank you text */}
        <p className="text-sm text-zinc-700 leading-relaxed text-center">
          感谢您参与本次高考志愿选择行为研究！您的回答对我们的研究至关重要，我们将认真分析您的数据。
        </p>

        {/* Reward summary card */}
        <div
          className="w-full rounded-xl px-5 py-4 border"
          style={{
            backgroundColor: "var(--pku-blue-light)",
            borderColor: "color-mix(in srgb, var(--pku-blue) 20%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: "var(--pku-blue)" }}
          >
            实验报酬
          </p>
          {totalPayout !== null ? (
            <p className="text-sm text-zinc-700 leading-relaxed">
              您的总报酬为{" "}
              <span className="font-bold text-zinc-900 text-base">
                ¥{totalPayout.toFixed(2)}
              </span>
              ，将在核实后发放至您填写的账号。
            </p>
          ) : (
            <p className="text-sm text-zinc-700 leading-relaxed">
              您的实验报酬将在核实后发放，具体金额由系统随机抽取的题目结果决定。请留意后续通知。
            </p>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed text-center">
          本次实验收集的数据仅用于学术研究，所有信息将严格保密，不会用于任何商业用途。
        </p>
      </div>
    </SurveyShell>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add app/complete/page.tsx && git commit -m "feat(ui): redesign complete page with checkmark and reward card"
```

---

## Task 7: Final build verification

**Files:** none (build only)

- [ ] **Step 1: Run full build**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npm run build 2>&1 | tail -30
```
Expected: `Route (app)` table with no errors. Warnings about `dynamic` server rendering are acceptable.

- [ ] **Step 2: Fix any build errors before proceeding**

If tsc or build errors appear, fix them in the relevant file and re-run. Common pitfall: Tailwind v4 does not support `bg-[var(--x)]` syntax in some contexts — use inline `style={{ backgroundColor: "var(--x)" }}` instead (already done in this plan).

- [ ] **Step 3: Final commit if any build fixes were needed**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && git add -p && git commit -m "fix(ui): resolve build errors from survey UI redesign"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|-------------|------|
| globals.css: warm-gray bg (#f8f7f5), card shadow, blue accent, font sizing, focus states | Task 1 |
| survey-shell: top blue accent bar | Task 2 |
| survey-shell: "北京大学智愿研究" logo text + badge | Task 2 |
| survey-shell: segmented progress bar showing X of Y | Task 2 |
| survey-shell: card-like main content area | Task 2 |
| survey-shell: footer attribution text | Task 2 |
| app/page.tsx: PKU branding, maroon title, better subtitle, rounded-full CTA | Task 3 |
| entry-form: section title "基本信息" + divider | Task 4 |
| entry-form: card-style radio buttons | Task 4 |
| entry-form: full-width selects | Task 4 |
| entry-form: college helper text | Task 4 |
| instructions: numbered steps in circles | Task 5 |
| instructions: key terms highlighted | Task 5 |
| instructions: prominent rounded-full CTA | Task 5 |
| complete: inline SVG checkmark | Task 6 |
| complete: reward summary in highlighted card | Task 6 |
| complete: professional thank-you message | Task 6 |
| build passes | Task 7 |

All requirements covered. No gaps.

### Placeholder scan

No TBD/TODO/placeholder patterns present. All code blocks are complete.

### Type consistency

- `SurveyShellProps.step` and `.totalSteps` used as `step!` and `totalSteps!` correctly inside `hasProgress` guard.
- `getBlockSequence` return type and `respondent.r1_block_order` are unchanged from original.
- `getTotalPayout` signature unchanged in Task 6.
- No new types introduced — all additions are JSX-only.
