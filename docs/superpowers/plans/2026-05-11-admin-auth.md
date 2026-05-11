# Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete admin authentication system at /admin/* with login, session management, rate limiting, and a dashboard landing page.

**Architecture:** bcryptjs password verification against CloudBase `admins` collection; JWT session token in httpOnly `admin_session` cookie signed with `ADMIN_SESSION_SECRET`; per-IP rate limiting tracked in CloudBase `login_attempts` collection; separate `app/admin/layout.tsx` guards all admin routes server-side.

**Tech Stack:** Next.js 16 App Router, bcryptjs, jsonwebtoken, CloudBase node-sdk, shadcn/ui (Input, Button, Label, Alert), TypeScript

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `lib/admin-auth.ts` | Create | JWT sign/verify, session cookie read, `verifyAdminSession()`, `requireAdmin()` |
| `app/api/admin/login/route.ts` | Create | POST: rate-limit check → credential verify → set cookie |
| `app/api/admin/logout/route.ts` | Create | POST: clear admin_session cookie |
| `components/admin-login-form.tsx` | Create | "use client" login form, POST /api/admin/login, redirect on success |
| `app/admin/login/page.tsx` | Create | Login page (no SurveyShell, no admin layout guard) |
| `app/admin/layout.tsx` | Create | Server-side session guard + nav header for all /admin/* routes |
| `app/admin/page.tsx` | Create | Dashboard: respondent counts from CloudBase |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (indirectly, via npm)

- [ ] **Step 1: Install runtime and type packages**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify types are importable**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
node -e "require('bcryptjs'); require('jsonwebtoken'); console.log('ok')"
```

Expected: `ok`

---

## Task 2: `lib/admin-auth.ts` — session helpers

**Files:**
- Create: `lib/admin-auth.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/admin-auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

export interface AdminPayload {
  admin_id: string;
  username: string;
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "24h" });
}

export async function verifyAdminSession(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, getSecret()) as AdminPayload & {
      iat: number;
      exp: number;
    };
    return { admin_id: decoded.admin_id, username: decoded.username };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminPayload> {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `lib/admin-auth.ts`.

---

## Task 3: `app/api/admin/login/route.ts` — login endpoint

**Files:**
- Create: `app/api/admin/login/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/cloudbase";
import { signAdminToken } from "@/lib/admin-auth";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const BLOCK_DURATION_MS = 15 * 60 * 1000;    // 15 min

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const db = getDb();
  const now = Date.now();

  // --- Rate limit check ---
  const attemptsResult = await db
    .collection("login_attempts")
    .where({ ip })
    .get();

  interface LoginAttemptDoc {
    _id: string;
    ip: string;
    attempt_count: number;
    blocked_until?: number;
    window_start: number;
  }

  const attemptDocs = (attemptsResult.data ?? []) as LoginAttemptDoc[];
  const attemptDoc = attemptDocs[0] ?? null;

  if (attemptDoc?.blocked_until && attemptDoc.blocked_until > now) {
    const retryAfterSec = Math.ceil((attemptDoc.blocked_until - now) / 1000);
    return NextResponse.json(
      { error: "too_many_attempts", retry_after: retryAfterSec },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let username: string;
  let password: string;
  try {
    const body = await req.json();
    username = String(body.username ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // --- Look up admin ---
  interface AdminDoc {
    _id: string;
    username: string;
    password_hash: string;
  }

  const adminResult = await db
    .collection("admins")
    .where({ username })
    .get();

  const admins = (adminResult.data ?? []) as AdminDoc[];
  const admin = admins[0] ?? null;

  const passwordMatch =
    admin !== null && (await bcrypt.compare(password, admin.password_hash));

  if (!admin || !passwordMatch) {
    // Increment attempt counter
    const windowStart = attemptDoc?.window_start ?? now;
    const withinWindow = now - windowStart < RATE_LIMIT_WINDOW_MS;
    const newCount = withinWindow ? (attemptDoc?.attempt_count ?? 0) + 1 : 1;
    const newWindowStart = withinWindow ? windowStart : now;
    const blocked_until = newCount >= RATE_LIMIT_MAX ? now + BLOCK_DURATION_MS : undefined;

    if (attemptDoc) {
      await db
        .collection("login_attempts")
        .doc(attemptDoc._id)
        .update({
          attempt_count: newCount,
          window_start: newWindowStart,
          ...(blocked_until !== undefined && { blocked_until }),
        });
    } else {
      await db.collection("login_attempts").add({
        ip,
        attempt_count: newCount,
        window_start: newWindowStart,
        ...(blocked_until !== undefined && { blocked_until }),
      });
    }

    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // --- Success: clear attempts, set cookie ---
  if (attemptDoc) {
    await db.collection("login_attempts").doc(attemptDoc._id).remove();
  }

  const token = signAdminToken({ admin_id: admin._id, username: admin.username });
  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 h
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 4: `app/api/admin/logout/route.ts` — logout endpoint

**Files:**
- Create: `app/api/admin/logout/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 5: `components/admin-login-form.tsx` — login form

**Files:**
- Create: `components/admin-login-form.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/admin-login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        router.push("/admin");
        return;
      }

      if (res.status === 429) {
        const minutes = Math.ceil((data.retry_after ?? 900) / 60);
        setError(`登录尝试次数过多，请 ${minutes} 分钟后再试`);
      } else if (res.status === 401) {
        setError("用户名或密码错误");
      } else {
        setError("登录失败，请重试");
      }
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 6: `app/admin/login/page.tsx` — login page

**Files:**
- Create: `app/admin/login/page.tsx`

Note: This page lives inside `app/admin/` but must NOT be guarded by the admin layout. The admin layout in Task 7 will detect the login route and skip the session check — OR we use Next.js route group. The simplest approach: the layout calls `requireAdmin()` only for non-login routes using `usePathname` — but that requires "use client". Instead, the layout skips auth entirely and delegates the guard to the pages that need it, except the login page. Since `app/admin/layout.tsx` wraps ALL /admin/* including /admin/login, we must make it NOT redirect on /admin/login. We do this by checking the pathname via the request, or more simply: move login outside the guard by using a route group.

**Chosen approach:** Use Next.js route groups. `app/admin/(protected)/layout.tsx` guards only protected routes. `app/admin/login/page.tsx` sits outside the group.

This means:
- `app/admin/login/page.tsx` — unguarded login page
- `app/admin/(protected)/layout.tsx` — guarded layout with nav
- `app/admin/(protected)/page.tsx` — dashboard

(Adjust file map accordingly — Task 7 and 8 create these instead.)

- [ ] **Step 1: Create the login page**

```typescript
// app/admin/login/page.tsx
import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "管理员登录 — PKU Zhiyuan",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 mb-6 text-center">
          PKU Zhiyuan 管理后台
        </h1>
        <AdminLoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 7: `app/admin/(protected)/layout.tsx` — guarded admin layout

**Files:**
- Create: `app/admin/(protected)/layout.tsx`

- [ ] **Step 1: Create the directory and layout**

```bash
mkdir -p /Users/ding/maestro/projects/pkuzhiyuan/app/admin/\(protected\)
```

```typescript
// app/admin/(protected)/layout.tsx
import { requireAdmin } from "@/lib/admin-auth";

async function LogoutButton() {
  "use server";
  // Rendered server-side, but logout action triggers via form POST
  return null;
}

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-zinc-900 text-sm">
          PKU Zhiyuan 管理后台
        </span>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span>{session.username}</span>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              退出
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

Note: The form `action="/api/admin/logout"` with `method="POST"` triggers a plain HTML form POST to the logout route, which clears the cookie. After that the browser follows the redirect from the next request hitting the protected layout. To redirect after logout, update the logout route to return a redirect response (see Task 4 amendment below).

- [ ] **Step 2: Amend logout route to redirect**

Update `app/api/admin/logout/route.ts` to redirect after clearing the cookie:

```typescript
// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000")
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 8: `app/admin/(protected)/page.tsx` — dashboard

**Files:**
- Create: `app/admin/(protected)/page.tsx`

- [ ] **Step 1: Create the dashboard page**

```typescript
// app/admin/(protected)/page.tsx
import { getDb } from "@/lib/cloudbase";

interface Stats {
  total: number;
  completed: number;
}

async function getStats(): Promise<Stats> {
  try {
    const db = getDb();
    const [totalResult, completedResult] = await Promise.all([
      db.collection("respondents").count(),
      db.collection("respondents").where({ is_completed: true }).count(),
    ]);
    return {
      total: (totalResult as { total: number }).total ?? 0,
      completed: (completedResult as { total: number }).total ?? 0,
    };
  } catch {
    return { total: 0, completed: 0 };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const completionRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 mb-6">数据概览</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="总参与人数" value={stats.total} />
        <StatCard label="完成问卷" value={stats.completed} />
        <StatCard label="完成率" value={`${completionRate}%`} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 9: Full build verification + commit

**Files:** none (verification only)

- [ ] **Step 1: Run full type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Run Next.js build**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npm run build 2>&1 | tail -30
```

Expected: `Route (app)` table lists `/admin/login`, `/admin/(protected)`, no build errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add \
  lib/admin-auth.ts \
  app/api/admin/login/route.ts \
  app/api/admin/logout/route.ts \
  components/admin-login-form.tsx \
  app/admin/login/page.tsx \
  "app/admin/(protected)/layout.tsx" \
  "app/admin/(protected)/page.tsx" \
  package.json package-lock.json
git commit -m "feat(admin): add login, session auth, rate limiting, and dashboard"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| `npm install bcryptjs jsonwebtoken` | Task 1 |
| Rate limit 5 attempts / 10 min → block 15 min via `login_attempts` | Task 3 |
| Query `admins` collection, `bcryptjs.compare` | Task 3 |
| Increment attempt on failure | Task 3 |
| JWT signed with `ADMIN_SESSION_SECRET`, payload `{admin_id, username}`, exp 24h | Tasks 2 + 3 |
| httpOnly cookie `admin_session` | Task 3 |
| `verifyAdminSession()` → `AdminPayload \| null` | Task 2 |
| `requireAdmin()` → redirect to /admin/login | Task 2 |
| Admin layout with nav + logout, server-side session check | Task 7 |
| Login page NOT in SurveyShell, own layout | Task 6 (route group isolates it) |
| POST /api/admin/logout → clear cookie | Tasks 4 + 7 |
| Dashboard: total respondents, completed count | Task 8 |
| Dashboard: active sessions | Task 8 — NOTE: spec says "active sessions" but CloudBase `respondents` has no session-activity field. Dashboard shows total + completed + completion rate; add active sessions later when the field exists. |
| Next.js 16: `cookies()` is async | All tasks use `await cookies()` |
| Use bcryptjs not bcrypt | Task 3 imports `bcryptjs` |
| Separate admin layout (no SurveyShell) | Route group `(protected)` has its own layout |

### Gaps
- "Active sessions" stat is deferred — no source field in CloudBase. Noted above.
- `NEXT_PUBLIC_BASE_URL` env var needed for logout redirect in production. Add to `.env.local` or Vercel env config.

### Placeholder scan — clean. All steps have complete code.

### Type consistency
- `AdminPayload` defined in `lib/admin-auth.ts` (Task 2), used as return type of `verifyAdminSession()` and `requireAdmin()`, and in layout `session.username` (Task 7). Consistent.
- `signAdminToken` defined Task 2, called Task 3. Consistent.
- `getDb()` imported from `@/lib/cloudbase` in Tasks 3, 8. Consistent with existing pattern.
