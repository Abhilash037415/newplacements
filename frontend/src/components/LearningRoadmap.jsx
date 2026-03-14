import { useState, useEffect } from "react";
import { getRoadmap, getProfile } from "../api/api";

const TYPE_COLORS = {
  video: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  practice: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  article: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  tool: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

const WEEK_ACCENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
];

export default function LearningRoadmap({ userId, profile: initialProfile }) {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(initialProfile || null);
  const [profileLoading, setProfileLoading] = useState(!initialProfile);

  useEffect(() => {
    if (!profile && userId) {
      setProfileLoading(true);
      getProfile(userId)
        .then((res) => setProfile(res.data.profile))
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    }
  }, [userId, profile]);

  const fetchRoadmap = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getRoadmap(userId);
      setRoadmap(res.data.roadmap);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate roadmap");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="max-w-[900px] mx-auto px-6 py-10 text-center">
        <span className="inline-block w-5 h-5 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm mt-3">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="1" className="mx-auto mb-5 opacity-50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0-3 3m3-3 3 3m-8.25 0h13.5A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Zm13.5-9H6.75" />
          </svg>
          <h3 className="text-white text-xl font-semibold mb-2">Create your profile first</h3>
          <p className="text-slate-400 mb-4 max-w-sm mx-auto leading-relaxed">
            Set up your profile so we can generate a personalized learning roadmap for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-7 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight mb-1">Learning Roadmap</h2>
          <div className="w-9 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-1" />
          <p className="text-slate-400 text-sm">Personalized 4-week study plan based on your profile</p>
        </div>
        <button
          onClick={fetchRoadmap}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin" style={{ animation: "spin 0.6s linear infinite" }} />
              Generating...
            </>
          ) : roadmap ? (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Regenerate
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              Generate Roadmap
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40 animate-fade-in">
          {error}
        </div>
      )}

      {/* Skills summary if available */}
      {profile.extracted_skills && profile.extracted_skills.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Your Skills (from Resume)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.extracted_skills.map((skill, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-500/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!roadmap && !loading && (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl animate-fade-in">
          <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#334155" strokeWidth="1" className="mx-auto mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0-3 3m3-3 3 3m-8.25 0h13.5A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Zm13.5-9H6.75" />
          </svg>
          <p className="text-slate-500 text-sm max-w-[300px] mx-auto leading-relaxed">
            Click <strong className="text-slate-400">Generate Roadmap</strong> to get a personalized 4-week study plan based on your profile and skills.
          </p>
        </div>
      )}

      {/* Roadmap weeks */}
      {roadmap && (
        <div className="flex flex-col gap-6">
          {roadmap.map((week, wi) => (
            <div
              key={wi}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${wi * 0.1}s` }}
            >
              {/* Week header */}
              <div className={`bg-gradient-to-r ${WEEK_ACCENTS[wi % 4]} px-6 py-3.5 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {week.week || wi + 1}
                  </span>
                  <div>
                    <h3 className="text-white font-semibold text-sm m-0">{week.title}</h3>
                    <p className="text-white/70 text-xs m-0">{week.focus}</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Tasks */}
                <div className="mb-4">
                  <h4 className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">Tasks</h4>
                  <ul className="list-none m-0 p-0 flex flex-col gap-2">
                    {(week.tasks || []).map((task, ti) => (
                      <li key={ti} className="flex items-start gap-2.5 px-3 py-2.5 bg-[#0a0f1e] rounded-lg text-xs">
                        <span className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5 text-violet-400 font-bold text-[0.65rem]">
                          {ti + 1}
                        </span>
                        <span className="text-slate-300 leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources */}
                {week.resources && week.resources.length > 0 && (
                  <div>
                    <h4 className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">Resources</h4>
                    <div className="flex flex-wrap gap-2">
                      {week.resources.map((res, ri) => {
                        const tc = TYPE_COLORS[res.type] || TYPE_COLORS.article;
                        return (
                          <a
                            key={ri}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${tc.bg} ${tc.text} border ${tc.border} text-xs font-medium transition-all duration-200 hover:scale-[1.02] hover:brightness-110 no-underline`}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            {res.title}
                            <span className={`px-1.5 py-0.5 rounded text-[0.6rem] uppercase ${tc.bg}`}>{res.type}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
