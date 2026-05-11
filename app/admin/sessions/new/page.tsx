import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSessionForm from "@/components/admin-session-form";

const ADMIN_SESSION_COOKIE = "admin_session";

export default async function NewSessionPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_SESSION_COOKIE)?.value) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">创建新场次</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建后系统自动生成唯一入口链接
          </p>
        </div>
        <AdminSessionForm />
      </div>
    </div>
  );
}
