interface SurveyShellProps {
  title?: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}

export default function SurveyShell({
  title,
  step,
  totalSteps,
  children,
}: SurveyShellProps) {
  const progress =
    step !== undefined && totalSteps !== undefined
      ? Math.round((step / totalSteps) * 100)
      : null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-screen">
      {progress !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>第 {step} / {totalSteps} 步</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {title && (
        <h1 className="text-xl font-semibold text-zinc-900 mb-4">{title}</h1>
      )}
      {children}
    </div>
  );
}
