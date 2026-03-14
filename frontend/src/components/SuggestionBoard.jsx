export default function SuggestionBoard({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  const icons = [
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />,
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />,
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />,
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />,
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />,
  ];

  const accentColors = [
    { bg: "bg-violet-500/10", stroke: "#a78bfa" },
    { bg: "bg-cyan-500/10", stroke: "#22d3ee" },
    { bg: "bg-fuchsia-500/10", stroke: "#d946ef" },
    { bg: "bg-amber-500/10", stroke: "#fbbf24" },
    { bg: "bg-emerald-500/10", stroke: "#34d399" },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">AI Suggestions</h3>
      </div>
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        {suggestions.map((s, i) => {
          const accent = accentColors[i % accentColors.length];
          return (
            <li
              key={i}
              className="flex gap-3 px-4 py-3.5 bg-[#0a0f1e] rounded-xl border border-transparent transition-all duration-200 hover:border-slate-700 hover:translate-x-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`w-9 h-9 rounded-lg ${accent.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={accent.stroke} strokeWidth="1.5">
                  {icons[i % icons.length]}
                </svg>
              </div>
              <div>
                <strong className="block text-slate-200 text-sm mb-0.5">{s.title}</strong>
                <p className="m-0 text-slate-400 text-xs leading-relaxed">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
