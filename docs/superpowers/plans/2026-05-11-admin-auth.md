# Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete admin auth: JWT httpOnly cookie session, login/logout API routes with rate limiting, Edge middleware route guards, admin layout with logout, and admin root redirect.

**Architecture:** `ADMIN_SESSION_SECRET` signs 24-hour JWTs stored in httpOnly cookie `admin_session`. Middleware (Edge runtime) checks cookie _existence_ only and redirects. Full JWT verification happens in `verifyAdminSession()` used by the server-side admin layout. CloudBase stores `admins` (bcrypt hashes) and `login_attempts` (per-IP rate limiting). Login page lives at `app/admin/login/` — the admin layout uses a route group `(protected)` to exclude it from the auth guard.

**Tech Stack:** Next.js 16 App Router, TypeScript, bcryptjs (pure JS), jsonwebtoken, next/server Edge middleware, CloudBase node-sdk, shadcn/ui (Button, Input, Label, Card).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/admin-auth.ts` | Create | `ADMIN_COOKIE` constant, `AdminPayload` type, `verifyAdminSession()` |
| `app/admin/login/page.tsx` | Create | Login page (unguarded — outside `(protected)` group) |
| `components/admin-login-form.tsx` | Create | `"use client"` form: POST credentials, redirect on success |
| `app/api/admin/login/route.ts` | Create | Rate limit → bcrypt verify → sign JWT → set cookie |
| `app/api/admin/logout/route.ts` | Create | Clear `admin_session` cookie |
| `middleware.ts` | Create (root) | Edge route guard: admin + survey cookie checks |
| `app/admin/(protected)/layout.tsx` | Create | Server layout: `verifyAdminSession()` → header + logout |
| `app/admin/(protected)/page.tsx` | Create | Admin root: `redirect("/admin/sessions")` |

**Route group note:** `app/admin/(protected)/` is a Next.js route group — URLs remain `/admin/sessions`, `/admin/export`, `/admin` (no `(protected)` in URL). `app/admin/login/page.tsx` sits outside the group, so it is not wrapped by the protected layout.

For this to work, the existing pages must be moved:
- `app/admin/sessions/` → `app/admin/(protected)/sessions/` 
- `app/admin/export/` → `app/admin/(protected)/export/`

This is included in Task 7.

---

## Pre-flight: Install dependencies

Before starting, ensure packages are installed (the brief says to run this first):

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

Expected: `added N packages` with no errors.

---

## Task 1: `lib/admin-auth.ts` — session helper

**Files:**
- Create: `lib/admin-auth.ts`

- [ ] **Step 1.1: Create the file**

```typescript
// lib/admin-auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const ADMIN_COOKIE = "admin_session";

export interface AdminPayload {
  admin_id: string;
  username: string;
}

export async function verifyAdminSession(): Promise<AdminPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET not configured");
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret) as AdminPayload & jwt.JwtPayload;
    return { admin_id: payload.admin_id, username: payload.username };
  } catch {
    return null;
  }
}
```

- [ ] **Step 1.2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "lib/admin-auth"
```

Expected: no output (no errors on this file).

- [ ] **Step 1.3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add lib/admin-auth.ts
git commit -m "feat(admin): add verifyAdminSession JWT helper"
```

---

## Task 2: `components/admin-login-form.tsx` — client login form

**Files:**
- Create: `components/admin-login-form.tsx`

- [ ] **Step 2.1: Create the file**

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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/admin/sessions");
        return;
      }
      if (res.status === 429) {
        const mins = Math.ceil(((data as { retry_after?: number }).retry_after ?? 900) / 60);
        setError(`登录尝试次数过多，请 ${mins} 分钟后再试`);
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
          disabled={loading}
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
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2.2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "admin-login-form"
```

Expected: no output.

- [ ] **Step 2.3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add components/admin-login-form.tsx
git commit -m "feat(admin): add AdminLoginForm client component"
```

---

## Task 3: `app/admin/login/page.tsx` — login page (unguarded)

**Files:**
- Create: `app/admin/login/page.tsx`

This is a server component. It lives at `app/admin/login/` — outside the `(protected)` route group — so it is NOT wrapped by the protected layout.

- [ ] **Step 3.1: Create the file**

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

- [ ] **Step 3.2: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add app/admin/login/page.tsx
git commit -m "feat(admin): add login page"
```

---

## Task 4: `app/api/admin/login/route.ts` — login API with rate limiting

**Files:**
- Create: `app/api/admin/login/route.ts`

Logic:
1. Parse `{ username, password }` from JSON body.
2. Extract IP from `x-forwarded-for` header.
3. Query `login_attempts` collection by IP. If `blocked_until > Date.now()`, return 429.
4. Query `admins` collection by `username`. If none found, return 401 (constant-time: still runs bcrypt compare on a dummy hash to avoid timing attacks; here we simplify and just return 401).
5. `bcrypt.compare(password, admin.password_hash)`. On failure: upsert `login_attempts` — increment counter, set `blocked_until` if counter >= 5. Return 401.
6. On success: clear `login_attempts` doc. Sign JWT. Set httpOnly cookie. Return `{ ok: true }`.

- [ ] **Step 4.1: Create the file**

```typescript
// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/cloudbase";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptDoc {
  _id: string;
  ip: string;
  attempts: number;
  blocked_until?: number;
}

interface AdminDoc {
  _id: string;
  username: string;
  password_hash: string;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Parse body
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

  const ip = getIp(req);
  const db = getDb();
  const now = Date.now();

  // Rate limit check
  const attemptsRes = await db
    .collection("login_attempts")
    .where({ ip })
    .limit(1)
    .get();
  const attemptDoc = ((attemptsRes.data ?? []) as LoginAttemptDoc[])[0] ?? null;

  if (attemptDoc?.blocked_until && attemptDoc.blocked_until > now) {
    const retryAfter = Math.ceil((attemptDoc.blocked_until - now) / 1000);
    return NextResponse.json(
      { error: "too_many_attempts", retry_after: retryAfter },
      { status: 429 }
    );
  }

  // Admin lookup
  const adminRes = await db
    .collection("admins")
    .where({ username })
    .limit(1)
    .get();
  const admin = ((adminRes.data ?? []) as AdminDoc[])[0] ?? null;

  // Password check
  const valid =
    admin !== null && (await bcrypt.compare(password, admin.password_hash));

  if (!valid) {
    // Increment attempts
    const newCount = (attemptDoc?.attempts ?? 0) + 1;
    const update: Partial<LoginAttemptDoc> & { ip: string } = {
      ip,
      attempts: newCount,
      ...(newCount >= MAX_ATTEMPTS ? { blocked_until: now + BLOCK_MS } : {}),
    };
    if (attemptDoc) {
      await db.collection("login_attempts").doc(attemptDoc._id).update(update);
    } else {
      await db.collection("login_attempts").add(update);
    }
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Success — clear attempts, issue token, set cookie
  if (attemptDoc) {
    await db.collection("login_attempts").doc(attemptDoc._id).remove();
  }

  const token = jwt.sign(
    { admin_id: admin._id, username: admin.username },
    secret,
    { expiresIn: "24h" }
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
```

- [ ] **Step 4.2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "api/admin/login"
```

Expected: no output.

- [ ] **Step 4.3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add app/api/admin/login/route.ts
git commit -m "feat(admin): add login API with bcrypt verify and rate limiting"
```

---

## Task 5: `app/api/admin/logout/route.ts` — logout API

**Files:**
- Create: `app/api/admin/logout/route.ts`

- [ ] **Step 5.1: Create the file**

```typescript
// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
```

- [ ] **Step 5.2: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add app/api/admin/logout/route.ts
git commit -m "feat(admin): add logout API route"
```

---

## Task 6: `middleware.ts` — Edge route guard

**Files:**
- Create: `middleware.ts` (project root, same level as `package.json`)

**Critical constraints:**
- Runs in Edge runtime (V8 only). No Node.js APIs. No `require()`. No CloudBase.
- Import only from `"next/server"`.
- Only checks cookie _existence_ — no JWT verification here.

Guarded routes:
- Admin: `/admin`, `/admin/sessions`, `/admin/export` → needs `admin_session` → redirect `/admin/login`
- Survey: `/instructions`, `/diagnostic`, `/report`, `/payment`, `/block/*`, `/comprehension/*` → needs `respondent_id` → redirect `/`
- NOT guarded: `/admin/login` (must be absent from matcher)

- [ ] **Step 6.1: Create the file**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin route guard
  const isAdminProtected =
    pathname === "/admin" ||
    pathname === "/admin/sessions" ||
    pathname === "/admin/export";

  if (isAdminProtected) {
    if (!req.cookies.get("admin_session")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Survey route guard
  const isSurveyProtected =
    pathname === "/instructions" ||
    pathname === "/diagnostic" ||
    pathname === "/report" ||
    pathname === "/payment" ||
    pathname.startsWith("/block/") ||
    pathname.startsWith("/comprehension/");

  if (isSurveyProtected) {
    if (!req.cookies.get("respondent_id")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/sessions",
    "/admin/export",
    "/instructions",
    "/diagnostic",
    "/report",
    "/payment",
    "/block/:path*",
    "/comprehension/:path*",
  ],
};
```

- [ ] **Step 6.2: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | grep "middleware"
```

Expected: no output.

- [ ] **Step 6.3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add middleware.ts
git commit -m "feat(admin): add Edge middleware for admin and survey route guards"
```

---

## Task 7: Admin protected layout + move existing pages

**Files:**
- Create: `app/admin/(protected)/layout.tsx`
- Create: `components/admin-logout-button.tsx`
- Move: `app/admin/sessions/` → `app/admin/(protected)/sessions/`
- Move: `app/admin/export/` → `app/admin/(protected)/export/`

**Why move:** The route group `(protected)` wraps sessions and export under the guarded layout. URLs remain `/admin/sessions` and `/admin/export` — Next.js strips the group name from the URL.

- [ ] **Step 7.1: Create client logout button**

```typescript
// components/admin-logout-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      退出登录
    </Button>
  );
}
```

- [ ] **Step 7.2: Create the protected layout**

```bash
mkdir -p "/Users/ding/maestro/projects/pkuzhiyuan/app/admin/(protected)"
```

```typescript
// app/admin/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-zinc-900 text-sm">
          PKU Zhiyuan 管理后台
        </span>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>{session.username}</span>
          <AdminLogoutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7.3: Move sessions and export pages into the route group**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
mkdir -p "app/admin/(protected)/sessions"
mkdir -p "app/admin/(protected)/export"
mv app/admin/sessions/page.tsx "app/admin/(protected)/sessions/page.tsx"
mv app/admin/export/page.tsx "app/admin/(protected)/export/page.tsx"
rmdir app/admin/sessions
rmdir app/admin/export
```

- [ ] **Step 7.4: Remove the inline auth guards from the moved pages**

The pages previously had their own cookie checks (`if (!cookieStore.get(ADMIN_SESSION_COOKIE)?.value) redirect("/admin/login")`). The layout now handles this — remove the duplication.

Open `app/admin/(protected)/sessions/page.tsx` and remove:
```typescript
const ADMIN_SESSION_COOKIE = "admin_session";
// ... and the block:
const cookieStore = await cookies();
if (!cookieStore.get(ADMIN_SESSION_COOKIE)?.value) {
  redirect("/admin/login");
}
```
Also remove the unused imports `cookies` and `redirect` if they are no longer needed after this removal.

Open `app/admin/(protected)/export/page.tsx` and remove the `isAuthenticated()` function and its call.

- [ ] **Step 7.5: Type-check**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 7.6: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add \
  components/admin-logout-button.tsx \
  "app/admin/(protected)/layout.tsx" \
  "app/admin/(protected)/sessions/page.tsx" \
  "app/admin/(protected)/export/page.tsx"
git rm app/admin/sessions/page.tsx app/admin/export/page.tsx 2>/dev/null || true
git commit -m "feat(admin): add protected layout with nav/logout; move sessions and export into route group"
```

---

## Task 8: `app/admin/(protected)/page.tsx` — admin root redirect

**Files:**
- Create: `app/admin/(protected)/page.tsx`

This file makes `/admin` (after auth) redirect to `/admin/sessions`.

- [ ] **Step 8.1: Create the file**

```typescript
// app/admin/(protected)/page.tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/sessions");
}
```

- [ ] **Step 8.2: Full type-check + build**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npx tsc --noEmit 2>&1
```

Expected: zero errors.

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan && npm run build 2>&1 | tail -30
```

Expected: build succeeds. Route table should include `/admin/login`, `/admin/sessions`, `/admin/export`, `/admin`.

- [ ] **Step 8.3: Commit**

```bash
cd /Users/ding/maestro/projects/pkuzhiyuan
git add "app/admin/(protected)/page.tsx"
git commit -m "feat(admin): redirect /admin root to /admin/sessions"
```

---

## Environment Setup

Add to `.env.local` before running dev server:

```bash
# Generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add to `.env.local`:
```
ADMIN_SESSION_SECRET=<output from above>
```

---

## Post-Implementation Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `GET /admin/login` → renders form (no redirect loop)
- [ ] `GET /admin/sessions` without cookie → 307 to `/admin/login`
- [ ] POST credentials → `admin_session` cookie set → `GET /admin/sessions` loads
- [ ] Logout button → cookie cleared → `GET /admin/sessions` redirects again
- [ ] `GET /instructions` without `respondent_id` → redirects to `/`

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| `lib/admin-auth.ts` with `verifyAdminSession()`, `ADMIN_COOKIE` | Task 1 |
| `app/admin/login/page.tsx` outside admin layout | Task 3 (route group ensures this) |
| `components/admin-login-form.tsx` "use client", POST, router.push | Task 2 |
| `/api/admin/login`: rate limit via `login_attempts`, bcrypt compare | Task 4 |
| On failure: increment `login_attempts` | Task 4 |
| On success: JWT sign, httpOnly cookie, `{ ok: true }` | Task 4 |
| `/api/admin/logout`: clear cookie | Task 5 |
| `middleware.ts`: admin + survey route guards, Edge runtime | Task 6 |
| Admin layout with title + logout button, `verifyAdminSession()` guard | Task 7 |
| `app/admin/page.tsx` redirect to `/admin/sessions` | Task 8 |
| Next.js 16: `await cookies()` everywhere | All tasks |
| bcryptjs not bcrypt | Task 4 |
| No Node.js APIs in middleware | Task 6 |

### Gaps / Notes
- The spec says `app/admin/layout.tsx` — but using `app/admin/(protected)/layout.tsx` is strictly better (avoids redirect loop on login page). URLs are unchanged.
- The spec's `app/admin/page.tsx` becomes `app/admin/(protected)/page.tsx` for the same reason.
- `login_attempts` blocked_until threshold: spec says "blocked_until > now" — implemented exactly. Threshold is 5 failures triggering a 15-minute block.
- `login_attempts` documents are matched by `ip` field. CloudBase `where({ ip })` returns the doc or empty array.

### Type consistency
- `AdminPayload` defined in `lib/admin-auth.ts` Task 1; used in Task 4 (jwt.sign payload) and Task 7 (layout `session.username`). Consistent.
- `ADMIN_COOKIE` defined Task 1; imported in Tasks 4 and 5. Consistent.
- `verifyAdminSession()` defined Task 1; called in Task 7. Consistent return type `AdminPayload | null`.
- `getDb()` imported from `@/lib/cloudbase` in Task 4. Matches existing codebase pattern.
