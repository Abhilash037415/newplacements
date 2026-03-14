import { useState, useEffect, useMemo } from "react";
import { getDsaAnalysis, getProfile } from "../api/api";

const LEVEL_CONFIG = {
  strong: { label: "Strong", color: "emerald", icon: "🟢", desc: "10+ problems solved" },
  moderate: { label: "Moderate", color: "amber", icon: "🟡", desc: "3-9 problems solved" },
  weak: { label: "Weak", color: "rose", icon: "🔴", desc: "1-2 problems solved" },
  not_attempted: { label: "Not Attempted", color: "slate", icon: "⚪", desc: "0 problems solved" },
};

const COLOR_MAP = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/20", bar: "bg-amber-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/20", bar: "bg-rose-500" },
  slate: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", bar: "bg-slate-500" },
};

const DSA_SHEETS = [
  {
    name: "Striver's SDE Sheet",
    desc: "191 problems · Top interview questions from Google, Amazon, Microsoft",
    url: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/",
    icon: "🔥",
    bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/20",
  },
  {
    name: "NeetCode 150",
    desc: "150 LeetCode problems · Grouped by pattern for systematic prep",
    url: "https://neetcode.io/practice",
    icon: "🎯",
    bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20",
  },
  {
    name: "Love Babbar DSA Sheet",
    desc: "450 problems · Covers all DSA topics with increasing difficulty",
    url: "https://www.geeksforgeeks.org/dsa-sheet-by-love-babbar/",
    icon: "💡",
    bg: "bg-yellow-500/10", text: "text-yellow-300", border: "border-yellow-500/20",
  },
  {
    name: "Fraz SDE Sheet",
    desc: "250+ problems · Company-wise categorized for FAANG prep",
    url: "https://leadcoding.in/dsa-sheet-by-fraz/",
    icon: "📋",
    bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/20",
  },
  {
    name: "Company-Wise Problems Sheet",
    desc: "Amazon, Google, Microsoft, Flipkart & more company questions",
    url: "https://docs.google.com/spreadsheets/d/1hLdmc7hdlWNj3OlXoGoGDcWpr89fKEoXLD2wTEmXEQs/edit?usp=drivesdk",
    icon: "🏢",
    bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20",
  },
  {
    name: "LeetCode Top Interview 150",
    desc: "150 must-do problems · Official LeetCode interview prep list",
    url: "https://leetcode.com/studyplan/top-interview-150/",
    icon: "⭐",
    bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/20",
  },
  {
    name: "Blind 75",
    desc: "75 essential problems · Most frequently asked in tech interviews",
    url: "https://leetcode.com/discuss/general-discussion/460599/blind-75-leetcode-questions",
    icon: "👁️",
    bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/20",
  },
  {
    name: "Apna College DSA Sheet",
    desc: "400+ problems · Beginner-friendly with video explanations",
    url: "https://docs.google.com/spreadsheets/d/1rv9W8K4K5fAGEg05DGcyMkV1vlvkz5c2rNwLWpt21TE/edit?usp=drivesdk",
    icon: "📚",
    bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/20",
  },
];

export default function DSAAnalysis({ profile: initialProfile, userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(initialProfile || null);
  const [activeFilters, setActiveFilters] = useState(new Set(["strong", "moderate", "weak", "not_attempted"]));
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch profile if not passed as prop
  useEffect(() => {
    if (!profile && userId) {
      getProfile(userId)
        .then((res) => setProfile(res.data.profile))
        .catch(() => {});
    }
  }, [userId, profile]);

  const lcUsername = profile?.leetcode_username;

  useEffect(() => {
    if (!lcUsername) return;
    const fetchDsa = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getDsaAnalysis(lcUsername);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch DSA analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchDsa();
  }, [lcUsername]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filtered topics based on active filters and search
  const filteredDsa = useMemo(() => {
    if (!data?.dsa_analysis) return null;
    const dsa = data.dsa_analysis;
    const result = {};
    for (const key of Object.keys(LEVEL_CONFIG)) {
      if (!activeFilters.has(key)) continue;
      const topics = dsa[key] || [];
      if (searchTerm.trim()) {
        result[key] = topics.filter((t) => t.topic.toLowerCase().includes(searchTerm.toLowerCase()));
      } else {
        result[key] = topics;
      }
    }
    return result;
  }, [data, activeFilters, searchTerm]);

  const filteredCount = useMemo(() => {
    if (!filteredDsa) return 0;
    return Object.values(filteredDsa).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredDsa]);

  if (!lcUsername) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-white text-xl font-bold tracking-tight mb-1">DSA Analysis</h2>
        <div className="w-9 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-5" />

        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl mb-6">
          <p className="text-slate-400 text-sm">Add your LeetCode username in the Profile to see topic-wise DSA analysis.</p>
        </div>

        <DSAPracticeSheets />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto text-center py-20">
        <span className="inline-block w-5 h-5 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm mt-3">Analyzing your DSA skills...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-red-900/25 text-red-300 px-4 py-3 rounded-xl text-sm border border-red-900/40">{error}</div>
      </div>
    );
  }

  if (!data || !data.dsa_analysis) return null;

  const { dsa_analysis: dsa, topic_stats, easy, medium, hard, total_solved } = data;
  const maxSolved = Math.max(...(topic_stats || []).map((t) => t.solved), 1);

  return (
    <div className="max-w-[1200px] mx-auto">
      <h2 className="text-white text-xl font-bold tracking-tight mb-1">DSA Analysis</h2>
      <div className="w-9 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* ── Left Sidebar: Platform Stats ── */}
        <div className="flex flex-col gap-5">
          {/* LeetCode Stats */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">LeetCode</h3>
              {profile?.leetcode_verified && (
                <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400 text-[0.6rem] font-semibold">Verified</span>
              )}
            </div>

            {profile?.leetcode_username ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-amber-300 text-[0.65rem] font-medium mb-1">@{profile.leetcode_username}</p>
                  <span className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {profile.leetcode_rating || 0}
                  </span>
                  <p className="text-slate-500 text-[0.6rem] mt-0.5">Contest Rating</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <SidebarStat label="Easy" value={profile.leetcode_easy ?? 0} color="emerald" />
                  <SidebarStat label="Medium" value={profile.leetcode_medium ?? 0} color="amber" />
                  <SidebarStat label="Hard" value={profile.leetcode_hard ?? 0} color="rose" />
                </div>

                <div className="space-y-1.5">
                  <SidebarRow label="Total Solved" value={profile.leetcode_problems_solved ?? 0} />
                  <SidebarRow label="Contests" value={profile.leetcode_contests ?? 0} />
                  <SidebarRow label="Ranking" value={profile.leetcode_ranking ? `#${Number(profile.leetcode_ranking).toLocaleString()}` : "N/A"} />
                </div>

                {/* Difficulty bar */}
                <div className="mt-3">
                  <p className="text-slate-500 text-[0.55rem] uppercase tracking-wider mb-1.5">Difficulty Breakdown</p>
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                    {(profile.leetcode_problems_solved ?? 0) > 0 && (
                      <>
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((profile.leetcode_easy ?? 0) / profile.leetcode_problems_solved) * 100}%` }} />
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${((profile.leetcode_medium ?? 0) / profile.leetcode_problems_solved) * 100}%` }} />
                        <div className="h-full bg-rose-500 transition-all" style={{ width: `${((profile.leetcode_hard ?? 0) / profile.leetcode_problems_solved) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[0.55rem] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Easy</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Medium</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Hard</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-xs text-center py-4">No LeetCode profile linked</p>
            )}
          </div>

          {/* CodeChef Stats */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">CodeChef</h3>
              {profile?.codechef_verified && (
                <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400 text-[0.6rem] font-semibold">Verified</span>
              )}
            </div>

            {profile?.codechef_username ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-emerald-300 text-[0.65rem] font-medium mb-1">@{profile.codechef_username}</p>
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {profile.codechef_rating || 0}
                  </span>
                  <p className="text-slate-500 text-[0.6rem] mt-0.5">Current Rating</p>
                  {profile.codechef_stars > 0 && (
                    <p className="text-yellow-400 text-sm mt-1">{"★".repeat(profile.codechef_stars)}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <SidebarRow label="Highest Rating" value={profile.codechef_highest_rating ?? 0} />
                  <SidebarRow label="Problems Solved" value={profile.codechef_problems_solved ?? 0} />
                  <SidebarRow label="Global Rank" value={profile.codechef_global_rank ? `#${Number(profile.codechef_global_rank).toLocaleString()}` : "N/A"} />
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-xs text-center py-4">No CodeChef profile linked</p>
            )}
          </div>
        </div>

        {/* ── Right: DSA Topic Analysis ── */}
        <div>
          {/* Difficulty Distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <DsaStatCard label="Total Solved" value={total_solved} color="violet" />
            <DsaStatCard label="Easy" value={easy} color="emerald" />
            <DsaStatCard label="Medium" value={medium} color="amber" />
            <DsaStatCard label="Hard" value={hard} color="rose" />
          </div>

          {/* Filters */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-5">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider m-0">Filters</p>
              {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
                const c = COLOR_MAP[cfg.color];
                const isActive = activeFilters.has(key);
                const count = (dsa[key] || []).length;
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all duration-200 bg-transparent ${
                      isActive
                        ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                        : "border-slate-700 text-slate-500 opacity-50 hover:opacity-75"
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topics..."
                className="w-full pl-9 pr-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1e] text-slate-100 text-xs outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/12 placeholder:text-slate-500"
              />
            </div>
            <p className="text-slate-500 text-[0.6rem] mt-2">Showing {filteredCount} topics</p>
          </div>

          {/* Summary Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
              const count = (dsa[key] || []).length;
              const c = COLOR_MAP[cfg.color];
              return (
                <div key={key} className={`flex flex-col items-center p-4 rounded-xl ${c.bg} border ${c.border}`}>
                  <span className="text-2xl font-bold">{cfg.icon}</span>
                  <span className={`text-lg font-bold ${c.text} mt-1`}>{count}</span>
                  <span className="text-[0.65rem] uppercase tracking-wider text-slate-400">{cfg.label}</span>
                  <span className="text-[0.55rem] text-slate-500 mt-0.5">{cfg.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Topic-wise Breakdown (filtered) */}
          {filteredDsa && Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
            const topics = filteredDsa[key] || [];
            if (topics.length === 0) return null;
            const c = COLOR_MAP[cfg.color];
            return (
              <div key={key} className="mb-5">
                <h3 className={`text-sm font-semibold ${c.text} mb-3 flex items-center gap-2`}>
                  <span>{cfg.icon}</span> {cfg.label} Topics ({topics.length})
                </h3>
                <div className="grid gap-2">
                  {topics.map((t) => (
                    <div key={t.topic} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${c.bg} border ${c.border}`}>
                      <span className={`text-sm font-medium ${c.text} min-w-[160px]`}>{t.topic}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max((t.solved / maxSolved) * 100, 2)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${c.text} min-w-[40px] text-right`}>{t.solved}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredCount === 0 && (
            <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl mb-5">
              <p className="text-slate-500 text-sm">No topics match your current filters.</p>
            </div>
          )}

          {/* Guidance Section */}
          {((dsa.weak || []).length > 0 || (dsa.not_attempted || []).length > 0) && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mt-6">
              <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Targeted Guidance
              </h3>
              <div className="space-y-3">
                {(dsa.weak || []).map((t) => (
                  <div key={t.topic} className="flex items-start gap-3">
                    <span className="text-rose-400 text-xs mt-0.5">●</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{t.topic}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        You've solved only {t.solved} problem{t.solved !== 1 ? "s" : ""}. Practice {Math.max(10 - t.solved, 5)} more easy/medium problems on this topic.
                      </p>
                    </div>
                  </div>
                ))}
                {(dsa.not_attempted || []).map((t) => (
                  <div key={t.topic} className="flex items-start gap-3">
                    <span className="text-slate-500 text-xs mt-0.5">●</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{t.topic}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Not attempted yet. Start with 5 easy problems to build fundamentals, then move to medium.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DSA Practice Sheets */}
          <DSAPracticeSheets />
        </div>
      </div>
    </div>
  );
}

function DSAPracticeSheets() {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mt-6">
      <h3 className="text-sm font-semibold text-violet-300 mb-1 flex items-center gap-2">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        DSA Practice Sheets
      </h3>
      <p className="text-slate-500 text-xs mb-4">Curated problem lists and company-wise sheets to boost your preparation</p>

      {/* Featured Sheet */}
      <a
        href="https://www.risingbrain.org/sheet?utm_source=sp_auto_dm&utm_referrer=sp_auto_dm"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200 group no-underline"
      >
        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-violet-300 text-sm font-semibold group-hover:text-violet-200 transition-colors">Rising Brain DSA Sheet</p>
          <p className="text-slate-400 text-xs mt-0.5">Comprehensive DSA practice sheet with topic-wise problems and difficulty levels</p>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2" className="shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>

      {/* Company-wise & Popular Sheets */}
      <h4 className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Company-Wise & Popular Sheets</h4>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {DSA_SHEETS.map((sheet) => (
          <a
            key={sheet.name}
            href={sheet.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${sheet.bg} border ${sheet.border} hover:brightness-125 transition-all duration-200 group no-underline`}
          >
            <span className="text-lg">{sheet.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`${sheet.text} text-sm font-medium truncate`}>{sheet.name}</p>
              <p className="text-slate-500 text-[0.65rem] mt-0.5">{sheet.desc}</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={`${sheet.text} opacity-40 group-hover:opacity-80 shrink-0`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

function SidebarStat({ label, value, color }) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  };
  return (
    <div className={`flex flex-col items-center p-2.5 rounded-xl border ${colors[color]}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[0.55rem] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function SidebarRow({ label, value }) {
  return (
    <div className="flex justify-between items-center px-3 py-1.5 bg-[#0a0f1e] rounded-lg text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-semibold">{value}</span>
    </div>
  );
}

function DsaStatCard({ label, value, color }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  };
  return (
    <div className={`flex flex-col items-center p-4 rounded-xl border ${colors[color]}`}>
      <span className="text-2xl font-bold">{value ?? 0}</span>
      <span className="text-[0.65rem] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}
