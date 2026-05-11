import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import AdminSessionList from "@/components/admin-session-list";
import type { Session } from "@/lib/types";

const ADMIN_SESSION_COOKIE = "admin_session";

export default async function AdminSessionsPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_SESSION_COOKIE)?.value) {
    redirect("/admin/login");
  }

  let sessions: Session[] = [];
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM sessions ORDER BY created_at DESC`;
    sessions = rows.map((r) => ({
      ...r,
      college_preset: Array.isArray(r.college_preset)
        ? r.college_preset
        : JSON.parse((r.college_preset as string) ?? "[]"),
    })) as Session[];
  } catch {
    // Render with empty list; API errors surface in client component
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">场次管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              每个场次对应一条入口链接，分发给受访学校使用
            </p>
          </div>
          <Link href="/admin/sessions/new" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            创建新场次
          </Link>
        </div>

        <AdminSessionList sessions={sessions} />
      </div>
    </div>
  );
}
