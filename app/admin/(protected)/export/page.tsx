import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { kvList } from "@/lib/kv";
import { AdminExport } from "@/components/admin-export";

const ADMIN_SESSION_COOKIE = "admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

async function getCount(prefix: string): Promise<number> {
  try {
    const keys = await kvList(prefix);
    return keys.length;
  } catch {
    return 0;
  }
}

export default async function ExportPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const [respondentCount, responseCount, paymentCount] = await Promise.all([
    getCount("respondent:"),
    getCount("response:"),
    getCount("payment:"),
  ]);

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
