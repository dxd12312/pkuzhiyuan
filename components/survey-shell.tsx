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
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8f7f5" }}>
      {/* Blue accent bar */}
      <div className="h-1" style={{ backgroundColor: "#1a56db" }} />

      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "#1a56db" }}>
              北京大学
            </span>
            <span className="text-xs text-zinc-400">×</span>
            <span className="text-xs text-zinc-500">智愿研究</span>
          </div>
          {step !== undefined && totalSteps !== undefined && (
            <span className="text-xs text-zinc-400">
              {step} / {totalSteps}
            </span>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {step !== undefined && totalSteps !== undefined && (
        <div className="bg-white border-b">
          <div className="mx-auto max-w-lg flex">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className="h-1 flex-1"
                style={{
                  backgroundColor: i < step ? "#1a56db" : "#e5e7eb",
                  marginRight: i < totalSteps - 1 ? "2px" : "0",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content card */}
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-xl bg-white shadow-sm border border-zinc-100 px-5 py-6">
          {title && (
            <h1 className="text-lg font-semibold text-zinc-900 mb-5">{title}</h1>
          )}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-zinc-400">本研究由北京大学经济学院主持</p>
      </footer>
    </div>
  );
}
