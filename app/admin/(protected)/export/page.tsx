import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { AdminExport } from "@/components/admin-export";

const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export default async function ExportPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const sql = getSql();
  const [respondentRows, responseRows, paymentRows] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM respondents`.catch(() => [{ n: 0 }]),
    sql`SELECT COUNT(*)::int AS n FROM responses`.catch(() => [{ n: 0 }]),
    sql`SELECT COUNT(*)::int AS n FROM payments`.catch(() => [{ n: 0 }]),
  ]);
  const respondentCount = (respondentRows[0]?.n as number) ?? 0;
  const responseCount = (responseRows[0]?.n as number) ?? 0;
  const paymentCount = (paymentRows[0]?.n as number) ?? 0;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold">数据导出</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        CSV 文件使用 UTF-8 BOM 编码，可直接用 Excel 打开。研究数据与支付数据分开导出以保护隐私。
      </p>
      <AdminExport
        respondentCount={respondentCount}
        responseCount={responseCount}
        paymentCount={paymentCount}
      />
    </div>
  );
}
