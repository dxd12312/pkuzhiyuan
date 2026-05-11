import { getSql } from "@/lib/db";
import SurveyShell from "@/components/survey-shell";
import EntryForm from "@/components/entry-form";
import type { Session } from "@/lib/types";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionEntryPage({ params }: Props) {
  const { sessionId } = await params;

  let session: Session | null = null;
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM sessions WHERE session_id = ${sessionId}`;
    if (rows.length > 0) {
      session = {
        ...rows[0],
        college_preset: Array.isArray(rows[0].college_preset)
          ? rows[0].college_preset
          : JSON.parse((rows[0].college_preset as string) ?? "[]"),
      } as Session;
    }
  } catch {
    // Fall through to error state
  }

  if (!session) {
    return (
      <SurveyShell title="链接无效">
        <p className="text-center text-muted-foreground py-8">
          该入口链接不存在，请联系研究团队获取正确链接。
        </p>
      </SurveyShell>
    );
  }

  if (!session.is_active) {
    return (
      <SurveyShell title="链接已关闭">
        <p className="text-center text-muted-foreground py-8">
          该问卷入口已暂停收集，感谢您的参与。
        </p>
      </SurveyShell>
    );
  }

  return (
    <SurveyShell title="基本信息">
      <EntryForm
        sessionId={sessionId}
        version={session.version}
        sessionData={{
          province: session.province,
          school_name: session.school_name,
          college_preset: session.college_preset,
        }}
      />
    </SurveyShell>
  );
}
