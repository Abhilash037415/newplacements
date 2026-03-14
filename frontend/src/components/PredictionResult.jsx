import { useEffect, useState } from "react";

export default function PredictionResult({ score, features }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 900;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const getColor = (s) => {
    if (s >= 75) return "#34d399";
    if (s >= 50) return "#fbbf24";
    if (s >= 25) return "#fb923c";
    return "#f43f5e";
  };

  const getLabel = (s) => {
    if (s >= 75) return "Excellent";
    if (s >= 50) return "Good";
    if (s >= 25) return "Average";
    return "Needs Improvement";
  };

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getColor(score);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
        <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Placement Readiness Score</h3>
      </div>

      <div className="flex flex-col items-center mb-5">
        <div className="relative inline-block mb-3">
          {/* Glow effect behind the ring */}
          <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: color }} />
          <svg width="150" height="150" viewBox="0 0 120 120" className="relative">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-extrabold tracking-tight" style={{ color }}>
            {animatedScore}
          </div>
        </div>
        <span
          className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold border"
          style={{ background: `${color}18`, color, borderColor: `${color}30` }}
        >
          {getLabel(score)}
        </span>
      </div>

      {features && (
        <div>
          <h4 className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">Features Breakdown</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {Object.entries(features).map(([key, val]) => (
              <div className="flex justify-between px-3 py-2 bg-[#0a0f1e] rounded-lg text-xs" key={key}>
                <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-slate-200 font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
