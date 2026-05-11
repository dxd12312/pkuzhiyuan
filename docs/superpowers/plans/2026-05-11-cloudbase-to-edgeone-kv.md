# CloudBase → EdgeOne KV Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all CloudBase (ap-shanghai Node.js SDK) calls with EdgeOne Pages KV storage so every API route runs in the V8 edge runtime without cross-region latency or blocked connections.

**Architecture:** A thin `lib/kv.ts` helper wraps the globally-injected `kv` binding. All API routes add `export const runtime = 'edge'` and import from `@/lib/kv` instead of `@/lib/cloudbase`. Node.js-only libraries (`jsonwebtoken`, `uuid`, `crypto` from node, `@cloudbase/node-sdk`) are replaced with Web Crypto / `jose` / `bcryptjs` (pure JS).

**Tech Stack:** Next.js 16 App Router, EdgeOne Pages V8 edge runtime, EdgeOne KV (global binding named `kv`), `jose` (JWT), `bcryptjs` (pure JS — works in V8), Web Crypto API (`crypto.subtle`, `crypto.randomUUID()`).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/kv.ts` | **CREATE** | KV helper: `kvGet`, `kvPut`, `kvDelete`, `kvList`, `kvGetAll` |
| `lib/cloudbase.ts` | **DELETE** | CloudBase singleton — no longer needed |
| `lib/randomize.ts` | **MODIFY** | Replace `uuid` + `crypto.createHash` (Node) with `crypto.randomUUID()` + `crypto.subtle` (Web Crypto); make hash functions async |
| `lib/threshold.ts` | **MODIFY** | Replace `getDb()` query with `kvGet("score_threshold:{province}:2026:{subject}")` |
| `lib/session.ts` | **MODIFY** | Replace `getDb()` query with `kvGet("session:{session_id}")` |
| `lib/admin-auth.ts` | **MODIFY** | Replace `jsonwebtoken` with `jose` `jwtVerify` |
| `app/api/respondent/create/route.ts` | **MODIFY** | Add edge runtime; `kvPut("respondent:{id}", doc)`; `kvPut("college_labels:{id}", labels)` |
| `app/api/respondent/current/route.ts` | **MODIFY** | Add edge runtime; `kvGet("respondent:{id}")` |
| `app/api/response/submit/route.ts` | **MODIFY** | Add edge runtime; replace `uuid` + CloudBase with `crypto.randomUUID()` + kvPut/kvGet-merge-kvPut |
| `app/api/status/route.ts` | **MODIFY** | Add edge runtime; replace DB ping with KV list probe |
| `app/api/comprehension/submit/route.ts` | **MODIFY** | Add edge runtime; merge comp fields into existing response KV entry |
| `app/api/diagnostic/submit/route.ts` | **MODIFY** | Add edge runtime; replace `uuid` + CloudBase with `crypto.randomUUID()` + kvPut |
| `app/api/payment/draw/route.ts` | **MODIFY** | Add edge runtime; replace `uuid` + CloudBase queries with kvGet/kvPut |
| `app/api/payment/submit/route.ts` | **MODIFY** | Add edge runtime; kvGet + merge + kvPut |
| `app/api/report/generate/route.ts` | **MODIFY** | Add edge runtime; replace `uuid` + CloudBase queries/saves with kvGet/kvPut |
| `app/api/admin/login/route.ts` | **MODIFY** | Add edge runtime; replace `jwt.sign` + CloudBase with `jose` SignJWT + kvGet/kvPut |
| `app/api/admin/logout/route.ts` | **MODIFY** | Add edge runtime (no storage change needed) |
| `app/api/admin/sessions/route.ts` | **MODIFY** | Add edge runtime; kvGetAll/kvPut for sessions |
| `app/api/admin/sessions/toggle/route.ts` | **MODIFY** | Add edge runtime; kvGet + merge + kvPut |
| `app/api/admin/export/respondents/route.ts` | **MODIFY** | Add edge runtime; `kvGetAll("respondent:")` |
| `app/api/admin/export/responses/route.ts` | **MODIFY** | Add edge runtime; `kvGetAll("response:")` + filter `record_type === "block"` |
| `app/api/admin/export/payments/route.ts` | **MODIFY** | Add edge runtime; `kvGetAll("payment:")` |
| `app/api/college-labels/[respondentId]/route.ts` | **MODIFY** | Add edge runtime; `kvGet("college_labels:{id}")` |

---

## Task 1: Install/uninstall packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jose, uninstall CloudBase SDK and jsonwebtoken**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npm install jose
npm uninstall @cloudbase/node-sdk jsonwebtoken @types/jsonwebtoken
```

Expected output: no errors; `package.json` no longer lists `@cloudbase/node-sdk`, `jsonwebtoken`, `@types/jsonwebtoken`.

- [ ] **Step 2: Verify jose is installed**

```bash
ls node_modules/jose/package.json
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): replace cloudbase+jsonwebtoken with jose for edge runtime"
```

---

## Task 2: Create `lib/kv.ts`

**Files:**
- Create: `lib/kv.ts`

- [ ] **Step 1: Create the KV helper**

Create `/Users/ding/maestro/projects/pkuzhiyuan/lib/kv.ts` with this exact content:

```typescript
// EdgeOne Pages injects the KV binding as a global variable.
// The binding name must match what is configured in the EdgeOne console ("kv").
declare const kv: {
  get(key: string, options?: { type?: string }): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    complete: boolean;
    cursor: string | null;
    keys: { key: string }[];
  }>;
};

export async function kvGet<T>(key: string): Promise<T | null> {
  return kv.get(key, { type: "json" }) as Promise<T | null>;
}

export async function kvPut(key: string, data: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(data));
}

export async function kvDelete(key: string): Promise<void> {
  await kv.delete(key);
}

export async function kvList(prefix: string): Promise<string[]> {
  const allKeys: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await kv.list({ prefix, limit: 256, cursor });
    allKeys.push(...result.keys.map((k) => k.key));
    cursor = result.complete ? undefined : (result.cursor ?? undefined);
  } while (cursor);
  return allKeys;
}

export async function kvGetAll<T>(prefix: string): Promise<T[]> {
  const keys = await kvList(prefix);
  const results: T[] = [];
  for (const key of keys) {
    const val = await kvGet<T>(key);
    if (val !== null) results.push(val);
  }
  return results;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -40
```

Expected: the only new errors (if any) will be in files still importing `cloudbase`. Errors in `lib/kv.ts` itself = stop and fix.

- [ ] **Step 3: Commit**

```bash
git add lib/kv.ts
git commit -m "feat(kv): add EdgeOne KV helper layer"
```

---

## Task 3: Rewrite `lib/randomize.ts` — remove Node crypto and uuid

**Files:**
- Modify: `lib/randomize.ts`

**Context:** Current file uses `import { v4 as uuidv4 } from "uuid"` and `import { createHash } from "crypto"` — both are Node.js-only. Web Crypto `crypto.subtle.digest` and `crypto.randomUUID()` are available in V8 edge runtime.

The hash functions become `async` because `crypto.subtle.digest` returns a Promise. All callers in API routes already `await` the randomize results indirectly — but `assignTreatmentGroup` and `assignBlockOrder` are called synchronously in `app/api/respondent/create/route.ts`. We will update those call sites in Task 7.

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `lib/randomize.ts`:

```typescript
export function generateRespondentId(): string {
  return crypto.randomUUID();
}

export function generateRandSeed(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function assignTreatmentGroup(
  seed: string
): Promise<"control" | "treatment"> {
  const hex = await sha256Hex(seed + "_group");
  const value = parseInt(hex.slice(0, 8), 16);
  return value % 2 === 0 ? "control" : "treatment";
}

export async function assignBlockOrder(
  seed: string
): Promise<"low_first" | "high_first"> {
  const hex = await sha256Hex(seed + "_order");
  const value = parseInt(hex.slice(0, 8), 16);
  return value % 2 === 0 ? "low_first" : "high_first";
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "randomize"
```

Expected: errors about `assignTreatmentGroup`/`assignBlockOrder` not being awaited in `respondent/create/route.ts`. Those will be fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add lib/randomize.ts
git commit -m "refactor(randomize): replace Node crypto/uuid with Web Crypto API"
```

---

## Task 4: Rewrite `lib/threshold.ts` and `lib/session.ts`

**Files:**
- Modify: `lib/threshold.ts`
- Modify: `lib/session.ts`

**Context:** Both files use `getDb()`. KV key patterns:
- `score_threshold:{province}:{year}:{subject_type}` → `{ threshold_score: number }`
- `session:{session_id}` → `Session` object

- [ ] **Step 1: Rewrite `lib/threshold.ts`**

```typescript
import { kvGet } from "@/lib/kv";

interface ThresholdRecord {
  threshold_score: number;
}

export async function isAboveThreshold(
  province: string,
  subjectType: string,
  score: number
): Promise<boolean> {
  const record = await kvGet<ThresholdRecord>(
    `score_threshold:${province}:2026:${subjectType}`
  );
  if (!record) return true; // no threshold configured = pass
  return score >= record.threshold_score;
}
```

- [ ] **Step 2: Rewrite `lib/session.ts`**

```typescript
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { Respondent } from "@/lib/types";

export async function getRespondentFromCookie(): Promise<Respondent | null> {
  const cookieStore = await cookies();
  const respondentId = cookieStore.get(COOKIE_NAME)?.value;
  if (!respondentId) return null;
  try {
    return await kvGet<Respondent>(`respondent:${respondentId}`);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "threshold|session\.ts"
```

Expected: no errors in these two files.

- [ ] **Step 4: Commit**

```bash
git add lib/threshold.ts lib/session.ts
git commit -m "refactor(lib): migrate threshold and session lookups to EdgeOne KV"
```

---

## Task 5: Rewrite `lib/admin-auth.ts` — replace jsonwebtoken with jose

**Files:**
- Modify: `lib/admin-auth.ts`

**Context:** `jsonwebtoken` uses Node.js crypto internally. `jose` is a pure Web Crypto implementation that works in V8 edge.

- [ ] **Step 1: Rewrite `lib/admin-auth.ts`**

```typescript
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "admin_session";

export async function verifyAdminSession(): Promise<{
  admin_id: string;
  username: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const secretStr = process.env.ADMIN_SESSION_SECRET;
  if (!secretStr) return null;

  try {
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jwtVerify(token, secret);
    const { admin_id, username } = payload as {
      admin_id?: string;
      username?: string;
    };
    if (!admin_id || !username) return null;
    return { admin_id, username };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "admin-auth"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/admin-auth.ts
git commit -m "refactor(auth): replace jsonwebtoken with jose for edge JWT verify"
```

---

## Task 6: Migrate `app/api/admin/login/route.ts`

**Files:**
- Modify: `app/api/admin/login/route.ts`

**Context:** This is the most complex migration:
1. Rate-limit: CloudBase `login_attempts` collection → KV key `login_attempt:{ip}`
2. Admin lookup: `admins` collection → KV key `admin:{username}`
3. JWT signing: `jwt.sign` → `jose` `SignJWT`
4. Record attempt update: CloudBase `inc()` command → KV read-merge-write

`bcryptjs` is pure JavaScript and runs in V8 — no change needed.

- [ ] **Step 1: Rewrite the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { kvGet, kvPut } from "@/lib/kv";

export const runtime = "edge";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Admin {
  admin_id: string;
  username: string;
  password_hash: string;
}

interface LoginAttempt {
  ip: string;
  count: number;
  window_start: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate-limit check
  try {
    const record = await kvGet<LoginAttempt>(`login_attempt:${ip}`);
    if (record) {
      const windowStart = new Date(record.window_start).getTime();
      if (
        Date.now() - windowStart < WINDOW_MS &&
        record.count >= MAX_ATTEMPTS
      ) {
        return NextResponse.json(
          { error: "请求过于频繁，请稍后再试" },
          { status: 429 }
        );
      }
    }
  } catch {
    // Non-fatal: proceed without rate-limit if KV unavailable
  }

  // Parse body
  let username: string;
  let password: string;
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
    };
    username = (body.username ?? "").trim();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "用户名和密码不能为空" },
      { status: 400 }
    );
  }

  // Lookup admin
  let admin: Admin | null = null;
  try {
    admin = await kvGet<Admin>(`admin:${username}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!admin) {
    await recordAttempt(ip);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    await recordAttempt(ip);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  // Clear failed attempts on success
  try {
    await kvPut(`login_attempt:${ip}`, { ip, count: 0, window_start: new Date().toISOString() });
  } catch {
    // Non-fatal
  }

  const secretStr = process.env.ADMIN_SESSION_SECRET;
  if (!secretStr) {
    return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
  }

  const secret = new TextEncoder().encode(secretStr);
  const token = await new SignJWT({
    admin_id: admin.admin_id,
    username: admin.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}

async function recordAttempt(ip: string): Promise<void> {
  try {
    const existing = await kvGet<LoginAttempt>(`login_attempt:${ip}`);
    const now = new Date().toISOString();
    if (existing) {
      await kvPut(`login_attempt:${ip}`, {
        ...existing,
        count: existing.count + 1,
      });
    } else {
      await kvPut(`login_attempt:${ip}`, { ip, count: 1, window_start: now });
    }
  } catch {
    // Non-fatal
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "admin/login"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/login/route.ts
git commit -m "refactor(admin/login): migrate to EdgeOne KV + jose JWT"
```

---

## Task 7: Migrate `app/api/respondent/create/route.ts`

**Files:**
- Modify: `app/api/respondent/create/route.ts`

**Context:** Two CloudBase adds (`respondents`, `college_labels`). Also calls `assignTreatmentGroup` and `assignBlockOrder` which are now `async`. Remove `uuid` import — use `generateRespondentId()` from `lib/randomize.ts`.

- [ ] **Step 1: Rewrite the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvPut } from "@/lib/kv";
import { assignCollegeLabels } from "@/lib/colleges";
import { isAboveThreshold } from "@/lib/threshold";
import {
  generateRespondentId,
  generateRandSeed,
  assignTreatmentGroup,
  assignBlockOrder,
} from "@/lib/randomize";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/constants";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      province,
      total_score,
      subject_track,
      version,
      colleges,
      school_id,
      class_id,
      student_seq,
    } = body as {
      session_id: string;
      province: string;
      total_score?: number;
      subject_track: string;
      version?: string;
      colleges?: string[];
      school_id?: string;
      class_id?: string;
      student_seq?: string;
    };

    const resolvedVersion = (version ?? "gaokao_senior") as
      | "gaokao_senior"
      | "rising_senior";

    if (!session_id || !province || !subject_track) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    if (resolvedVersion === "gaokao_senior" && total_score === undefined) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    const respondent_id = generateRespondentId();
    const rand_seed = generateRandSeed();
    const treatment_group = await assignTreatmentGroup(rand_seed);
    const r1_block_order = await assignBlockOrder(rand_seed);

    const ua = req.headers.get("user-agent") ?? "";
    const device_type: "mobile" | "desktop" =
      /Mobile|Android/i.test(ua) ? "mobile" : "desktop";

    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    let is_filtered = false;
    if (resolvedVersion === "gaokao_senior" && total_score !== undefined) {
      const above = await isAboveThreshold(province, subject_track, total_score);
      if (!above) is_filtered = true;
    }

    const doc = {
      respondent_id,
      session_id,
      version: resolvedVersion,
      treatment_group,
      r1_block_order,
      province,
      ...(total_score !== undefined && { total_score }),
      subject_track,
      ...(school_id !== undefined && { school_id }),
      ...(class_id !== undefined && { class_id }),
      ...(student_seq !== undefined && { student_seq }),
      device_type,
      user_agent: ua,
      ip_address,
      started_at: new Date().toISOString(),
      current_page: 0,
      is_completed: false,
      is_filtered,
      rand_seed,
    };

    await kvPut(`respondent:${respondent_id}`, doc);

    if (colleges && colleges.length > 0) {
      const labels = assignCollegeLabels(colleges, "student_input");
      await kvPut(`college_labels:${respondent_id}`, {
        respondent_id,
        ...labels,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, respondent_id, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({
      respondent_id,
      treatment_group,
      r1_block_order,
      filtered: is_filtered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "respondent/create"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/respondent/create/route.ts
git commit -m "refactor(api/respondent/create): migrate to EdgeOne KV edge runtime"
```

---

## Task 8: Migrate remaining simple respondent/response/status routes

**Files:**
- Modify: `app/api/respondent/current/route.ts`
- Modify: `app/api/status/route.ts`
- Modify: `app/api/response/submit/route.ts`

**Context for response/submit:** CloudBase used `.where().update()` to atomically `inc(current_page)`. KV has no atomic increment — do `kvGet` + `current_page + 1` + `kvPut`. Also replace `uuid` with `crypto.randomUUID()`.

- [ ] **Step 1: Rewrite `app/api/respondent/current/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { Respondent } from "@/lib/types";

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const respondent = await kvGet<Respondent>(`respondent:${respondent_id}`);

    if (!respondent) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(respondent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `app/api/status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { kvList } from "@/lib/kv";

export const runtime = "edge";

export async function GET() {
  try {
    // Probe KV with a bounded list — proves the binding is available
    await kvList("__ping__");
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      db_connected: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Rewrite `app/api/response/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { validateSingleCrossing, getSwitchingPoint } from "@/lib/mpl";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId, Respondent } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { cell_id, choices, invalid_attempt_count, first_invalid_pattern } =
      body as {
        cell_id: CellId;
        choices: ("A" | "B")[];
        invalid_attempt_count: number;
        first_invalid_pattern?: string;
      };

    if (!Array.isArray(choices) || choices.length !== 7) {
      return NextResponse.json(
        { error: "choices must have exactly 7 elements" },
        { status: 400 }
      );
    }
    if (!choices.every((c) => c === "A" || c === "B")) {
      return NextResponse.json(
        { error: "choices must be A or B" },
        { status: 400 }
      );
    }
    if (!validateSingleCrossing(choices)) {
      return NextResponse.json(
        { error: "non_single_crossing" },
        { status: 400 }
      );
    }

    const switching_point = getSwitchingPoint(choices);
    const response_id = crypto.randomUUID();

    const doc = {
      response_id,
      respondent_id,
      record_type: "block" as const,
      cell_id,
      presentation_order: 0,
      choices,
      switching_point,
      is_monotone: true,
      invalid_attempt_count,
      ...(first_invalid_pattern && { first_invalid_pattern }),
      page_entered_at: new Date().toISOString(),
      page_submitted_at: new Date().toISOString(),
    };

    await kvPut(`response:${respondent_id}:${cell_id}`, doc);

    // Increment current_page on respondent (no atomic increment in KV — read-modify-write)
    const respondent = await kvGet<Respondent>(`respondent:${respondent_id}`);
    if (respondent) {
      await kvPut(`respondent:${respondent_id}`, {
        ...respondent,
        current_page: respondent.current_page + 1,
      });
    }

    return NextResponse.json({ success: true, response_id, switching_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "respondent/current|status|response/submit"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/respondent/current/route.ts app/api/status/route.ts app/api/response/submit/route.ts
git commit -m "refactor(api): migrate respondent/current, status, response/submit to KV"
```

---

## Task 9: Migrate comprehension, diagnostic, college-labels routes

**Files:**
- Modify: `app/api/comprehension/submit/route.ts`
- Modify: `app/api/diagnostic/submit/route.ts`
- Modify: `app/api/college-labels/[respondentId]/route.ts`

**Context for comprehension/submit:** CloudBase did `.where({respondent_id, cell_id}).update(...)`. KV key `response:{respondent_id}:{cell_id}` — so `kvGet` + merge + `kvPut`.

- [ ] **Step 1: Rewrite `app/api/comprehension/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { CellId, BlockResponse } from "@/lib/types";

export const runtime = "edge";

const OPTION_VALUES: Record<string, number> = {
  "0": 0,
  "5": 5,
  "10": 10,
  "15": 15,
  "20": 20,
  "25": 25,
};

const CORRECT_ANSWERS: Record<CellId, string> = {
  r1_low: "20",
  r1_high: "20",
  r4_low: "5",
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { cell_id, answer } = body as { cell_id: CellId; answer: string };

    if (!cell_id || !(cell_id in CORRECT_ANSWERS)) {
      return NextResponse.json({ error: "invalid cell_id" }, { status: 400 });
    }

    if (!(answer in OPTION_VALUES)) {
      return NextResponse.json({ error: "invalid answer" }, { status: 400 });
    }

    const comp_correct = answer === CORRECT_ANSWERS[cell_id];

    const existing = await kvGet<BlockResponse>(
      `response:${respondent_id}:${cell_id}`
    );
    if (existing) {
      await kvPut(`response:${respondent_id}:${cell_id}`, {
        ...existing,
        comp_answer: answer,
        comp_correct,
        page_submitted_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, correct: comp_correct });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `app/api/diagnostic/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import type { DiagnosticAnswer } from "@/lib/diagnostic";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { answers } = body as { answers: DiagnosticAnswer };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers required" }, { status: 400 });
    }

    const doc = {
      diagnostic_id: crypto.randomUUID(),
      respondent_id,
      answers,
      submitted_at: new Date().toISOString(),
    };

    await kvPut(`diagnostic:${respondent_id}`, doc);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Rewrite `app/api/college-labels/[respondentId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { NEUTRAL_FALLBACKS } from "@/lib/colleges";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ respondentId: string }> }
) {
  try {
    const { respondentId } = await params;

    if (!respondentId) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    const doc = await kvGet<Record<string, unknown>>(
      `college_labels:${respondentId}`
    );

    if (!doc) {
      return NextResponse.json(NEUTRAL_FALLBACKS);
    }

    // Strip metadata fields
    const { respondent_id: _rid, ...labels } = doc;
    void _rid;

    return NextResponse.json(labels);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "comprehension|diagnostic|college-labels"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/comprehension/submit/route.ts app/api/diagnostic/submit/route.ts app/api/college-labels/\[respondentId\]/route.ts
git commit -m "refactor(api): migrate comprehension, diagnostic, college-labels to KV"
```

---

## Task 10: Migrate payment routes

**Files:**
- Modify: `app/api/payment/draw/route.ts`
- Modify: `app/api/payment/submit/route.ts`

**Context for draw:** idempotency check via `kvGet("payment:{respondent_id}")`. Fetch respondent via `kvGet`. Fetch block responses: iterate `kvList("response:{respondent_id}:")` + filter `record_type === "block"`.

- [ ] **Step 1: Rewrite `app/api/payment/draw/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut, kvList } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import { drawLottery } from "@/lib/lottery";
import type { BlockResponse, Respondent } from "@/lib/types";

export const runtime = "edge";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    // Idempotency: return existing payment if already drawn
    const existingPayment = await kvGet<Record<string, unknown>>(
      `payment:${respondent_id}`
    );
    if (existingPayment) {
      return NextResponse.json(existingPayment);
    }

    // Fetch respondent for rand_seed
    const respondent = await kvGet<Respondent>(`respondent:${respondent_id}`);
    if (!respondent) {
      return NextResponse.json(
        { error: "respondent_not_found" },
        { status: 404 }
      );
    }

    // Fetch all block responses for this respondent
    const responseKeys = await kvList(`response:${respondent_id}:`);
    const responses: BlockResponse[] = [];
    for (const key of responseKeys) {
      const r = await kvGet<BlockResponse>(key);
      if (r && r.record_type === "block") responses.push(r);
    }

    const result = drawLottery(responses, respondent.rand_seed);

    const payment_id = crypto.randomUUID();
    const doc = {
      payment_id,
      respondent_id,
      fixed_amount: 10,
      ...result,
      drawn_at: new Date().toISOString(),
      is_submitted: false,
    };

    await kvPut(`payment:${respondent_id}`, doc);

    return NextResponse.json(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `app/api/payment/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const respondent_id = cookieStore.get(COOKIE_NAME)?.value;

    if (!respondent_id) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    const body = await req.json();
    const { method, account, payee_name } = body as {
      method: "支付宝" | "微信" | "话费充值";
      account: string;
      payee_name: string;
    };

    if (!method || !account || !payee_name) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const existing = await kvGet<Record<string, unknown>>(
      `payment:${respondent_id}`
    );
    if (!existing) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    await kvPut(`payment:${respondent_id}`, {
      ...existing,
      payment_method: method,
      payment_account: account,
      payee_name,
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "payment"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/payment/draw/route.ts app/api/payment/submit/route.ts
git commit -m "refactor(api/payment): migrate draw and submit to EdgeOne KV"
```

---

## Task 11: Migrate `app/api/report/generate/route.ts`

**Files:**
- Modify: `app/api/report/generate/route.ts`

**Context:** Replace three CloudBase queries + two fire-and-forget adds with KV reads/writes. `uuid` → `crypto.randomUUID()`. The streaming logic itself is unchanged — only the storage calls change.

- [ ] **Step 1: Rewrite the file**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut, kvList } from "@/lib/kv";
import { COOKIE_NAME } from "@/lib/constants";
import {
  buildMessages,
  type DiagnosticAnswer,
  type ReportInput,
} from "@/lib/report-prompt";
import { buildFallbackReport } from "@/lib/report-fallback";
import type { Respondent, BlockResponse } from "@/lib/types";

export const runtime = "edge";

const AI_TIMEOUT_MS = 10_000;

async function fetchRespondentData(respondentId: string): Promise<{
  respondent: Respondent;
  diagnosticAnswers: DiagnosticAnswer[];
  blockResponses: BlockResponse[];
} | null> {
  const respondent = await kvGet<Respondent>(`respondent:${respondentId}`);
  if (!respondent) return null;

  const diagDoc = await kvGet<{ answers: DiagnosticAnswer }>(
    `diagnostic:${respondentId}`
  );
  const diagnosticAnswers: DiagnosticAnswer[] = diagDoc ? [diagDoc.answers] : [];

  const responseKeys = await kvList(`response:${respondentId}:`);
  const blockResponses: BlockResponse[] = [];
  for (const key of responseKeys) {
    const r = await kvGet<BlockResponse>(key);
    if (r) blockResponses.push(r);
  }

  return { respondent, diagnosticAnswers, blockResponses };
}

async function callOpenRouter(
  input: ReportInput
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.AI_API_KEY;
  const modelId = process.env.AI_MODEL_ID ?? "google/gemini-2.0-flash";
  if (!apiKey) throw new Error("AI_API_KEY not configured");

  const { system, user } = buildMessages(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: true,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => String(upstream.status));
    throw new Error(`OpenRouter error ${upstream.status}: ${errText}`);
  }
  if (!upstream.body) throw new Error("No response body from OpenRouter");
  return upstream.body;
}

function parseSseChunk(line: string): string {
  if (!line.startsWith("data: ")) return "";
  const json = line.slice(6).trim();
  if (json === "[DONE]") return "";
  try {
    const parsed = JSON.parse(json) as {
      choices?: { delta?: { content?: string } }[];
    };
    return parsed.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

export async function POST() {
  const startMs = Date.now();

  const cookieStore = await cookies();
  const respondentId = cookieStore.get(COOKIE_NAME)?.value;

  if (!respondentId) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let respondentData: Awaited<ReturnType<typeof fetchRespondentData>>;
  try {
    respondentData = await fetchRespondentData(respondentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!respondentData) {
    return NextResponse.json({ error: "respondent_not_found" }, { status: 404 });
  }

  const input: ReportInput = {
    respondent: respondentData.respondent,
    diagnosticAnswers: respondentData.diagnosticAnswers,
    blockResponses: respondentData.blockResponses,
  };

  const reportId = crypto.randomUUID();
  const encoder = new TextEncoder();
  const modelId = process.env.AI_MODEL_ID ?? "google/gemini-2.0-flash";
  let useAi = !!process.env.AI_API_KEY;

  if (useAi) {
    try {
      const upstreamBody = await callOpenRouter(input);
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const token = parseSseChunk(line);
                if (token) {
                  fullText += token;
                  controller.enqueue(encoder.encode(token));
                }
              }
            }
            if (buffer) {
              const token = parseSseChunk(buffer);
              if (token) {
                fullText += token;
                controller.enqueue(encoder.encode(token));
              }
            }
            controller.close();
            // Save report (fire-and-forget)
            kvPut(`ai_report:${respondentId}`, {
              report_id: reportId,
              respondent_id: respondentId,
              output_text: fullText,
              model_id: modelId,
              generation_ms: Date.now() - startMs,
              is_success: true,
              is_fallback: false,
              created_at: new Date().toISOString(),
            }).catch(() => {});
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch {
      useAi = false;
    }
  }

  // Fallback: rule-based report
  const fallbackText = buildFallbackReport(input);

  kvPut(`ai_report:${respondentId}`, {
    report_id: reportId,
    respondent_id: respondentId,
    output_text: fallbackText,
    model_id: "fallback",
    generation_ms: Date.now() - startMs,
    is_success: true,
    is_fallback: true,
    created_at: new Date().toISOString(),
  }).catch(() => {});

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let offset = 0;
      const CHUNK = 40;
      function push() {
        if (offset >= fallbackText.length) {
          controller.close();
          return;
        }
        controller.enqueue(
          encoder.encode(fallbackText.slice(offset, offset + CHUNK))
        );
        offset += CHUNK;
        setTimeout(push, 30);
      }
      push();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "report/generate"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/report/generate/route.ts
git commit -m "refactor(api/report): migrate generate route to EdgeOne KV edge runtime"
```

---

## Task 12: Migrate admin sessions and toggle routes

**Files:**
- Modify: `app/api/admin/sessions/route.ts`
- Modify: `app/api/admin/sessions/toggle/route.ts`
- Modify: `app/api/admin/logout/route.ts`

**Context for sessions GET:** CloudBase `orderBy().limit(200)` → `kvGetAll("session:")`. Order is not guaranteed — sort by `created_at` in JS. Sessions POST: `kvPut("session:{session_id}", session)`. Toggle: `kvGet` + merge + `kvPut`.

The `isAuthenticated` check in these files currently only checks the cookie exists (not verifies the JWT). Keep that behavior unchanged — the route already uses `verifyAdminSession` indirectly through the cookie presence check.

- [ ] **Step 1: Rewrite `app/api/admin/sessions/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut, kvGetAll } from "@/lib/kv";
import type { Session } from "@/lib/types";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";
const BASE_URL = "https://www.pkuzhiyuan.com";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await kvGetAll<Session>("session:");
    sessions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return NextResponse.json({ sessions: sessions.slice(0, 200) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      province: string;
      school_name?: string;
      version: "gaokao_senior" | "rising_senior";
      college_preset?: string[];
      score_threshold?: number;
    };

    const { province, school_name, version, college_preset, score_threshold } =
      body;

    if (!province || !version) {
      return NextResponse.json(
        { error: "province and version are required" },
        { status: 400 }
      );
    }

    const session_id = crypto.randomUUID();
    const entry_url = `${BASE_URL}/s/${session_id}`;
    const created_at = new Date().toISOString();

    const session: Session = {
      session_id,
      province,
      school_name: school_name ?? "",
      version,
      college_preset: college_preset ?? [],
      score_threshold,
      created_by: "admin",
      created_at,
      is_active: true,
      entry_url,
    };

    await kvPut(`session:${session_id}`, session);

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `app/api/admin/sessions/toggle/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvPut } from "@/lib/kv";
import type { Session } from "@/lib/types";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { session_id, is_active } = (await req.json()) as {
      session_id: string;
      is_active: boolean;
    };

    if (!session_id || typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "session_id and is_active required" },
        { status: 400 }
      );
    }

    const existing = await kvGet<Session>(`session:${session_id}`);
    if (!existing) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    await kvPut(`session:${session_id}`, { ...existing, is_active });

    return NextResponse.json({ ok: true, session_id, is_active });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add edge runtime to `app/api/admin/logout/route.ts`**

```typescript
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("admin_session");
  return response;
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "sessions|logout"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/sessions/route.ts app/api/admin/sessions/toggle/route.ts app/api/admin/logout/route.ts
git commit -m "refactor(api/admin): migrate sessions, toggle, logout to KV edge runtime"
```

---

## Task 13: Migrate admin export routes

**Files:**
- Modify: `app/api/admin/export/respondents/route.ts`
- Modify: `app/api/admin/export/responses/route.ts`
- Modify: `app/api/admin/export/payments/route.ts`

**Context:** CloudBase used paginated `skip/limit` loops. KV uses `kvGetAll` with a prefix. No pagination needed — `kvGetAll` already paginates through the KV list cursor internally.

- [ ] **Step 1: Rewrite `app/api/admin/export/respondents/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll } from "@/lib/kv";
import { toCsv } from "@/lib/csv";
import type { Respondent } from "@/lib/types";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const respondents = await kvGetAll<Respondent>("respondent:");
    respondents.sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );

    const rows = respondents.map((r) => ({
      respondent_id: r.respondent_id,
      session_id: r.session_id,
      version: r.version,
      treatment_group: r.treatment_group,
      r1_block_order: r.r1_block_order,
      province: r.province,
      total_score: r.total_score ?? "",
      province_rank: r.province_rank ?? "",
      subject_track: r.subject_track,
      target_batch: r.target_batch ?? "",
      device_type: r.device_type,
      started_at: r.started_at,
      submitted_at: r.submitted_at ?? "",
      current_page: r.current_page,
      is_completed: r.is_completed,
      is_filtered: r.is_filtered,
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="respondents_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `app/api/admin/export/responses/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll } from "@/lib/kv";
import { toCsv } from "@/lib/csv";
import type { BlockResponse } from "@/lib/types";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const responses = await kvGetAll<BlockResponse>("response:");
    const blockResponses = responses.filter((r) => r.record_type === "block");
    blockResponses.sort(
      (a, b) =>
        new Date(a.page_entered_at).getTime() -
        new Date(b.page_entered_at).getTime()
    );

    const rows = blockResponses.map((r) => ({
      response_id: r.response_id,
      respondent_id: r.respondent_id,
      cell_id: r.cell_id,
      presentation_order: r.presentation_order,
      choices: r.choices.join("|"),
      switching_point: r.switching_point,
      is_monotone: r.is_monotone,
      invalid_attempt_count: r.invalid_attempt_count,
      first_invalid_pattern: r.first_invalid_pattern ?? "",
      comp_answer: r.comp_answer ?? "",
      comp_correct: r.comp_correct ?? "",
      page_entered_at: r.page_entered_at,
      page_submitted_at: r.page_submitted_at ?? "",
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="responses_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Rewrite `app/api/admin/export/payments/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetAll } from "@/lib/kv";
import { toCsv } from "@/lib/csv";

export const runtime = "edge";

const ADMIN_SESSION_COOKIE = "admin_session";

interface PaymentRecord {
  payment_id?: string;
  respondent_id: string;
  payment_method?: string;
  payment_account?: string;
  payee_name?: string;
  amount?: number;
  is_drawn?: boolean;
  drawn_at?: string;
  is_submitted?: boolean;
  submitted_at?: string;
  created_at?: string;
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payments = await kvGetAll<PaymentRecord>("payment:");
    payments.sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
    );

    const rows = payments.map((p) => ({
      payment_id: p.payment_id ?? "",
      respondent_id: p.respondent_id,
      payment_method: p.payment_method ?? "",
      payment_account: p.payment_account ?? "",
      payee_name: p.payee_name ?? "",
      amount: p.amount ?? "",
      is_drawn: p.is_drawn ?? "",
      drawn_at: p.drawn_at ?? "",
      is_submitted: p.is_submitted ?? "",
      submitted_at: p.submitted_at ?? "",
      created_at: p.created_at ?? "",
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="payments_export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep -E "export"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/export/respondents/route.ts app/api/admin/export/responses/route.ts app/api/admin/export/payments/route.ts
git commit -m "refactor(api/admin/export): migrate all export routes to EdgeOne KV"
```

---

## Task 14: Delete `lib/cloudbase.ts` and run full build verification

**Files:**
- Delete: `lib/cloudbase.ts`

- [ ] **Step 1: Verify no remaining cloudbase imports**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && grep -r "cloudbase\|@cloudbase" --include="*.ts" --include="*.tsx" -l
```

Expected: no output (zero files still import cloudbase).

- [ ] **Step 2: Delete the file**

```bash
rm /Users/ding/maestro/projects/pkuzhiyuan/lib/cloudbase.ts
```

- [ ] **Step 3: Full type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 4: Build**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npm run build 2>&1
```

Expected: build succeeds. If there are errors, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete lib/cloudbase.ts — fully replaced by EdgeOne KV"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Create `lib/kv.ts` | Task 2 |
| Delete `lib/cloudbase.ts` | Task 14 |
| All routes: `export const runtime = 'edge'` | Tasks 6–13 |
| `lib/randomize.ts`: replace uuid + Node crypto | Task 3 |
| `lib/threshold.ts`: replace getDb | Task 4 |
| `lib/session.ts`: replace getDb | Task 4 |
| `lib/admin-auth.ts`: replace jsonwebtoken | Task 5 |
| `app/api/respondent/create`: KV + async randomize | Task 7 |
| `app/api/respondent/current` | Task 8 |
| `app/api/response/submit` | Task 8 |
| `app/api/status` | Task 8 |
| `app/api/comprehension/submit` | Task 9 |
| `app/api/diagnostic/submit` | Task 9 |
| `app/api/college-labels/[respondentId]` | Task 9 |
| `app/api/payment/draw` | Task 10 |
| `app/api/payment/submit` | Task 10 |
| `app/api/report/generate` | Task 11 |
| `app/api/admin/login` | Task 6 |
| `app/api/admin/logout` | Task 12 |
| `app/api/admin/sessions` | Task 12 |
| `app/api/admin/sessions/toggle` | Task 12 |
| `app/api/admin/export/respondents` | Task 13 |
| `app/api/admin/export/responses` | Task 13 |
| `app/api/admin/export/payments` | Task 13 |
| npm uninstall @cloudbase/node-sdk + jsonwebtoken | Task 1 |
| npm install jose | Task 1 |
| Replace uuid everywhere | Tasks 3, 6, 7, 8, 9, 10, 11, 12 |
| `bcryptjs` kept (pure JS, V8-compatible) | No change needed |
| `npx tsc --noEmit` after all changes | Task 14 |
| `npm run build` to verify | Task 14 |

All spec requirements covered.

### Placeholder scan

No TBD, TODO, or implement-later patterns found.

### Type consistency

- `kvGet<T>` / `kvPut` / `kvGetAll<T>` / `kvList` / `kvDelete` defined in Task 2 and used identically in all subsequent tasks.
- `assignTreatmentGroup` / `assignBlockOrder` changed to `async` in Task 3; call site updated with `await` in Task 7.
- `BlockResponse.record_type` is `"block"` (from `lib/types.ts`) — filter in Task 10 and Task 13 uses `r.record_type === "block"`.
- Key patterns used consistently: `respondent:{id}`, `response:{respondent_id}:{cell_id}`, `payment:{respondent_id}`, `diagnostic:{respondent_id}`, `session:{session_id}`, `college_labels:{respondent_id}`, `ai_report:{respondent_id}`, `login_attempt:{ip}`, `admin:{username}`, `score_threshold:{province}:2026:{subject_type}`.
