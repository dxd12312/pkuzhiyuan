import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-semibold">PKU 志愿 管理后台</span>
          <span className="text-sm text-muted-foreground">{session.username}</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
