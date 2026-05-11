import SurveyShell from "@/components/survey-shell";
import EntryForm from "@/components/entry-form";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionEntryPage({ params }: Props) {
  const { sessionId } = await params;

  return (
    <SurveyShell title="基本信息">
      <EntryForm sessionId={sessionId} />
    </SurveyShell>
  );
}
