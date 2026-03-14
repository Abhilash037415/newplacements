export default function MockInterviewReport({ report, onRestart, onBack }) {
  const evaluation = report?.evaluation || {};
  const fm = report?.faceMetrics || {};
  const faceAvailable = (fm.framesDetected ?? 0) > 0;

  const scoreCards = [
    {
      label: "Technical",
      value: evaluation.technical_score ?? 0,
      accent: "from-cyan-500 to-blue-500",
    },
    {
      label: "Communication",
      value: evaluation.communication_score ?? 0,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: "Confidence",
      value: evaluation.confidence_score ?? 0,
      accent: "from-violet-500 to-fuchsia-500",
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 pb-12 animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-400/80 mb-2">
            AI Mock Interview
          </p>
          <h2 className="text-white text-3xl font-bold tracking-tight">
            Final Evaluation Report
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Role: {report?.config?.role} · Level:{" "}
            {report?.config?.experienceLevel} · Session: {report?.sessionId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-sm hover:text-white hover:border-slate-500 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 text-slate-950 text-sm font-semibold"
          >
            New Interview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-[0.25em] mb-2">
                  Overall Rating
                </p>
                <h3 className="text-white text-2xl font-semibold">
                  {evaluation.overall_rating || "Pending"}
                </h3>
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
                Provider: {evaluation.provider || "unknown"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {scoreCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <p className="text-slate-500 text-xs uppercase tracking-[0.22em] mb-3">
                    {card.label}
                  </p>
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <span className="text-white text-3xl font-bold">
                      {Math.round(card.value)}
                    </span>
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${card.accent}`}
                      style={{
                        width: `${Math.max(0, Math.min(100, card.value))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ListCard
              title="Strengths"
              items={evaluation.strengths || []}
              tint="cyan"
              emptyLabel="No strengths returned."
            />
            <ListCard
              title="Weaknesses"
              items={evaluation.weaknesses || []}
              tint="rose"
              emptyLabel="No weaknesses returned."
            />
          </div>

          <ListCard
            title="Improvement Suggestions"
            items={evaluation.improvement_suggestions || []}
            tint="emerald"
            emptyLabel="No improvement suggestions returned."
          />

          <ListCard
            title="Face Coaching Tips"
            items={evaluation.face_analysis_suggestions || []}
            tint="amber"
            emptyLabel="No face coaching tips returned."
          />
        </div>

        <div className="space-y-6">
          {/* Last Observed Voice / Combined Metrics */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-slate-500 text-xs uppercase tracking-[0.22em] mb-3">
              Last Observed Metrics
            </p>
            <div className="space-y-4">
              <BarMetric
                label="Confidence"
                value={report?.metrics?.confidence ?? 0}
                accent="from-violet-500 to-fuchsia-500"
              />
              <BarMetric
                label="Engagement"
                value={report?.metrics?.engagement ?? 0}
                accent="from-cyan-500 to-blue-500"
              />
              <BarMetric
                label="Speech Clarity"
                value={report?.metrics?.fluency ?? 0}
                accent="from-emerald-500 to-teal-500"
              />
            </div>
          </div>

          {/* Face Analysis Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 text-xs uppercase tracking-[0.22em]">
                Face Analysis
              </p>
              <span
                className={`text-[0.65rem] px-2 py-0.5 rounded-full border font-medium ${
                  faceAvailable
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {faceAvailable
                  ? `✓ ${fm.framesDetected} frames analysed`
                  : "⚠ Fallback data"}
              </span>
            </div>
            <div className="space-y-4">
              <BarMetric
                label="Eye Contact"
                value={fm.eyeContact ?? 50}
                accent="from-cyan-500 to-blue-500"
              />
              <BarMetric
                label="Gaze Stability"
                value={fm.gazeStability ?? 50}
                accent="from-violet-500 to-fuchsia-500"
              />
              <BarMetric
                label="Engagement"
                value={fm.engagement ?? 50}
                accent="from-emerald-500 to-teal-500"
              />
              <BarMetric
                label="Face Confidence"
                value={fm.faceConfidence ?? 50}
                accent="from-amber-500 to-orange-500"
              />
            </div>
          </div>

          {/* Conversation Summary */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-slate-500 text-xs uppercase tracking-[0.22em] mb-3">
              Conversation Summary
            </p>
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {(report?.history || []).map((entry, index) => (
                <div
                  key={`${entry.type}-${index}`}
                  className={`rounded-2xl border px-4 py-3 ${entry.type === "question" ? "border-cyan-500/20 bg-cyan-500/8" : "border-slate-700 bg-slate-950/70"}`}
                >
                  <p
                    className={`text-[0.7rem] uppercase tracking-[0.2em] mb-2 ${entry.type === "question" ? "text-cyan-300" : "text-slate-500"}`}
                  >
                    {entry.type === "question" ? "AI Question" : "Your Answer"}
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListCard({ title, items, tint, emptyLabel }) {
  const tintMap = {
    cyan: "border-cyan-500/20 bg-cyan-500/8 text-cyan-300",
    rose: "border-rose-500/20 bg-rose-500/8 text-rose-300",
    emerald: "border-emerald-500/20 bg-emerald-500/8 text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/8 text-amber-300",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-slate-500 text-xs uppercase tracking-[0.22em] mb-4">
        {title}
      </p>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className={`rounded-2xl border px-4 py-3 text-sm ${tintMap[tint]}`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarMetric({ label, value, accent }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-xs text-slate-400">{Math.round(value)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${accent}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
