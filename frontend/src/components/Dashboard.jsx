import { useEffect, useMemo, useState } from "react";
import { getAnnouncements, getProfile, getSuggestions, predictScore } from "../api/api";
import PredictionResult from "./PredictionResult";
import ProfileForm from "./ProfileForm";
import SuggestionBoard from "./SuggestionBoard";

/* ─── Placement tips pool ─── */
const TIPS = [
  { icon: "code", text: "Solve at least 2 DSA problems daily on LeetCode or CodeChef to build consistency." },
  { icon: "brain", text: "Practice aptitude mock tests weekly — quantitative, logical reasoning, and verbal." },
  { icon: "chat", text: "Record yourself answering interview questions to improve communication skills." },
  { icon: "github", text: "Make meaningful GitHub commits daily — green streaks impress recruiters." },
  { icon: "star", text: "Build one end-to-end project with deployment. Quality > quantity." },
  { icon: "book", text: "Revise OS, DBMS, CN, and OOP basics — asked in almost every technical round." },
  { icon: "target", text: "Apply to at least 5 companies/week via LinkedIn, AngelList, and Internshala." },
  { icon: "people", text: "Attend hackathons and tech meetups — networking opens unseen opportunities." },
];

export default function Dashboard({ user, currentView = "dashboard", onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [features, setFeatures] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      const [profileRes, annRes] = await Promise.all([
        getProfile(user.id).catch(() => ({ data: { profile: null } })),
        getAnnouncements().catch(() => ({ data: { announcements: [] } }))
      ]);

      const prof = profileRes.data.profile;
      if (prof) {
        setProfile(prof);
        if (prof.placement_score !== undefined) {
          setPrediction(prof.placement_score);
        }
      } else {
        setProfile(null);
      }
      
      setAnnouncements(annRes.data.announcements || []);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => { fetchDashboardData(); }, []);

   const fetchProfile = async () => {
    try {
      const res = await getProfile(user.id);
      setProfile(res.data.profile);
      if (res.data.profile.placement_score !== undefined) {
        setPrediction(res.data.profile.placement_score);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };
  const handlePredict = async () => {
    setError("");
    setPredicting(true);
    try {
      const res = await predictScore(user.id);
      setPrediction(res.data.placement_score);
      setFeatures(res.data.features_used);
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed");
    } finally {
      setPredicting(false);
    }
  };

  const handleSuggestions = async () => {
    setError("");
    setSugLoading(true);
    try {
      const res = await getSuggestions(user.id);
      setSuggestions(res.data.suggestions);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load suggestions");
    } finally {
      setSugLoading(false);
    }
  };

  const handleProfileSaved = (savedProfile) => {
    setProfile(savedProfile);
    setPrediction(null);
    setFeatures(null);
    setSuggestions(null);
    onNavigate("dashboard");
  };

  /* ─── Derived data ─── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const skillBars = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "Coding", value: profile.coding_score ?? 0, max: 100, color: "from-violet-500 to-fuchsia-500", bg: "bg-violet-500/15" },
      { label: "Aptitude", value: profile.aptitude_score ?? 0, max: 100, color: "from-cyan-500 to-blue-500", bg: "bg-cyan-500/15" },
      { label: "Communication", value: profile.communication_score ?? 0, max: 100, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-500/15" },
      { label: "Attendance", value: profile.attendance_percentage ?? 0, max: 100, color: "from-amber-500 to-orange-500", bg: "bg-amber-500/15" },
      { label: "GitHub Activity", value: profile.github_activity_score ?? 0, max: 100, color: "from-pink-500 to-rose-500", bg: "bg-pink-500/15" },
      { label: "CGPA", value: profile.cgpa ?? 0, max: 10, color: "from-indigo-500 to-violet-500", bg: "bg-indigo-500/15" },
    ];
  }, [profile]);

  const checklist = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "CGPA above 7.0", done: (profile.cgpa ?? 0) >= 7.0 },
      { label: "GitHub profile verified", done: !!profile.github_verified },
      { label: "At least 2 internships", done: (profile.internships ?? 0) >= 2 },
      { label: "3+ projects built", done: (profile.projects_count ?? 0) >= 3 },
      { label: "Coding score ≥ 60", done: (profile.coding_score ?? 0) >= 60 },
      { label: "Aptitude score ≥ 60", done: (profile.aptitude_score ?? 0) >= 60 },
      { label: "Communication ≥ 60", done: (profile.communication_score ?? 0) >= 60 },
      { label: "At least 2 certifications", done: (profile.certifications_count ?? 0) >= 2 },
    ];
  }, [profile]);

  const checklistProgress = useMemo(() => {
    if (checklist.length === 0) return 0;
    return Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);
  }, [checklist]);

  const randomTips = useMemo(() => {
    const shuffled = [...TIPS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, []);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-slate-400">
        <div className="w-9 h-9 border-[3px] border-slate-800 border-t-violet-500 rounded-full animate-spin-fast" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (currentView === "edit") {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-7 pb-12 animate-fade-in">
        <ProfileForm userId={user.id} existingProfile={profile} onSaved={handleProfileSaved} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-7 pb-12">
          {/* ─── Welcome Banner ─── */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-violet-950/40 to-slate-900/90 border border-slate-800 rounded-2xl px-7 py-6 mb-6 animate-fade-in-up">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] pointer-events-none" />
            <p className="text-slate-400 text-sm mb-0.5">{greeting},</p>
            <h2 className="text-white text-2xl font-bold tracking-tight mb-1">
              {user.name || user.email.split("@")[0]}
            </h2>
            <p className="text-slate-400 text-sm max-w-lg">
              {profile
                ? "Track your placement readiness, analyze your skills, and get AI-powered suggestions to improve."
                : "Create your profile to unlock AI-powered placement predictions and personalized suggestions."}
            </p>
            {profile && prediction !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-slate-400 text-xs">Current Score:</span>
                <span className={`text-sm font-bold ${prediction >= 75 ? "text-emerald-400" : prediction >= 50 ? "text-amber-400" : prediction >= 25 ? "text-orange-400" : "text-rose-400"}`}>
                  {prediction}%
                </span>
              </div>
            )}
          </div>

          {/* ─── Announcements Block ─── */}
          {announcements.length > 0 && (
            <div className="grid grid-cols-1 mb-6 animate-fade-in-up">
              <div className="bg-slate-900/80 border border-violet-500/30 rounded-2xl overflow-hidden shadow-lg relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-5">
                  <div className="flex-shrink-0 flex items-start gap-3 w-full sm:w-1/4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 border border-violet-500/30">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-bold tracking-wide">Announcements</h3>
                      <p className="text-xs text-slate-400">Updates from Placement Cell</p>
                    </div>
                  </div>
                  <div className="w-full flex-grow flex gap-4 overflow-x-auto pb-2 sm:pb-0 snap-x hide-scrollbar">
                    {announcements.map((ann, idx) => (
                      <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 min-w-[280px] sm:min-w-[320px] max-w-[400px] snap-start hover:bg-slate-800 transition-colors">
                        <div className="flex justify-between items-start mb-1.5">
                          <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{ann.title}</h4>
                          <span className="text-[0.65rem] text-slate-500 font-medium whitespace-nowrap ml-2">
                            {new Date(ann.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">{ann.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40 animate-fade-in">
              {error}
            </div>
          )}

          {!profile ? (
            /* ─── No Profile State ─── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
              <div className="lg:col-span-2 text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <div className="mb-5 opacity-50">
                  <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="1" className="mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">No profile yet</h3>
                <p className="text-slate-400 mb-7 max-w-sm mx-auto leading-relaxed">
                  Set up your academic and skills profile to get AI-powered placement predictions.
                </p>
                <button
                  className="inline-flex px-7 py-2.5 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0"
                  onClick={() => onNavigate("edit")}
                >
                  Create Profile
                </button>
              </div>
              {/* Tips card for empty state */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
                <SectionHeader icon="lightbulb" title="Quick Tips" />
                <ul className="list-none m-0 p-0 flex flex-col gap-3 mt-4">
                  {randomTips.map((tip, i) => (
                    <TipItem key={i} tip={tip} index={i} />
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Stat Cards Row ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 animate-fade-in-up">
                <StatCard label="CGPA" value={profile.cgpa} icon="academic" accent="violet" />
                <StatCard label="GitHub" value={profile.github_activity_score ?? "—"} icon="github" accent="pink" />
                <StatCard label="Coding" value={profile.coding_score} icon="code" accent="cyan" />
                <StatCard label="Aptitude" value={profile.aptitude_score} icon="brain" accent="amber" />
                <StatCard label="Projects" value={profile.projects_count} icon="folder" accent="emerald" />
                <StatCard label="Internships" value={profile.internships} icon="briefcase" accent="indigo" />
              </div>

              {/* ─── Main Content 3-Column ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Column 1: Profile Overview + Actions ── */}
                <div className="flex flex-col gap-5">
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "0.06s" }}>
                    <div className="flex items-center justify-between mb-4">
                      <SectionHeader icon="user" title="Profile Overview" />
                      <button
                        className="px-3 py-1.5 border border-slate-600 rounded-lg bg-transparent text-slate-300 text-xs cursor-pointer transition-all duration-200 hover:border-violet-500 hover:text-violet-400"
                        onClick={() => onNavigate("edit")}
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <GridItem label="GitHub" value={
                        <>
                          {profile.github_username || "—"}
                          {profile.github_verified && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400 text-[0.68rem] font-semibold">Verified</span>
                          )}
                        </>
                      } />
                      <GridItem label="Languages" value={profile.github_language_diversity ?? "—"} />
                      <GridItem label="LeetCode" value={profile.leetcode_rating} />
                      <GridItem label="CodeChef" value={profile.codechef_rating} />
                      <GridItem label="Attendance" value={`${profile.attendance_percentage}%`} />
                      <GridItem label="Certifications" value={profile.certifications_count} />
                      <GridItem label="Project Impact" value={profile.project_impact_score ?? "—"} />
                      <GridItem label="Cert Impact" value={profile.certification_impact_score ?? "—"} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2.5 animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
                    <button
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      onClick={handlePredict}
                      disabled={predicting || !profile.github_verified}
                      title={!profile.github_verified ? "Verify your GitHub profile first" : ""}
                    >
                      {predicting ? (
                        <><span className="inline-block w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin-fast" /> Predicting...</>
                      ) : (
                        <>
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" /></svg>
                          Predict Placement Score
                        </>
                      )}
                    </button>

                    <button
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 border border-slate-600 rounded-xl bg-transparent text-slate-300 text-sm font-semibold cursor-pointer transition-all duration-200 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSuggestions}
                      disabled={sugLoading}
                    >
                      {sugLoading ? (
                        <><span className="inline-block w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin-fast" /> Analysing...</>
                      ) : (
                        <>
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                          Get AI Suggestions
                        </>
                      )}
                    </button>

                    {!profile.github_verified && (
                      <span className="text-amber-400 text-xs inline-flex items-center gap-1.5 justify-center">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                        GitHub verification required for prediction
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Column 2: Prediction + Suggestions ── */}
                <div className="flex flex-col gap-5">
                  {prediction !== null && (
                    <div className="animate-fade-in-up">
                      <PredictionResult score={prediction} features={features} />
                    </div>
                  )}

                  {suggestions && (
                    <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                      <SuggestionBoard suggestions={suggestions} />
                    </div>
                  )}

                  {prediction === null && !suggestions && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-10 flex flex-col items-center text-center min-h-[220px] justify-center gap-3 animate-fade-in">
                      <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#334155" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                      </svg>
                      <p className="text-slate-500 text-sm max-w-[240px] leading-relaxed">
                        Click <strong className="text-slate-400">Predict Score</strong> or <strong className="text-slate-400">Get AI Suggestions</strong> to see results
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Column 3: Checklist + Skills + Tips ── */}
                <div className="flex flex-col gap-5">
                  {/* Readiness Checklist */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
                    <SectionHeader icon="checklist" title="Readiness Checklist" />
                    <div className="mt-3 mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Progress</span>
                        <span className={`font-bold ${checklistProgress >= 75 ? "text-emerald-400" : checklistProgress >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                          {checklistProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${checklistProgress >= 75 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : checklistProgress >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-rose-500 to-pink-500"}`}
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                    </div>
                    <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                      {checklist.map((item, i) => (
                        <li key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#0a0f1e] text-xs">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-500/15" : "bg-slate-700/50"}`}>
                            {item.done ? (
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                            ) : (
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            )}
                          </span>
                          <span className={item.done ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Tips */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "0.16s" }}>
                    <SectionHeader icon="lightbulb" title="Quick Tips" />
                    <ul className="list-none m-0 p-0 flex flex-col gap-3 mt-4">
                      {randomTips.map((tip, i) => (
                        <TipItem key={i} tip={tip} index={i} />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ─── Projects & Certifications from Resume ─── */}
              {((profile.resume_projects?.length > 0) || (profile.resume_certifications?.length > 0)) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 animate-fade-in-up" style={{ animationDelay: "0.18s" }}>
                  {/* Projects */}
                  {profile.resume_projects?.length > 0 && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                        <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Projects ({profile.resume_projects.length})</h3>
                      </div>
                      <div className="space-y-2.5">
                        {profile.resume_projects.map((p, i) => (
                          <div key={i} className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                            <p className="text-blue-300 text-sm font-semibold">{p.name}</p>
                            {p.description && <p className="text-slate-400 text-xs mt-1 leading-relaxed">{p.description}</p>}
                            {p.technologies?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {p.technologies.map((t, j) => (
                                  <span key={j} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[0.65rem] font-medium border border-blue-500/20">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {profile.resume_certifications?.length > 0 && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.838 23.838 0 0 0-1.012 5.434c3.58.845 7.064 2.04 10.407 3.548a47.542 47.542 0 0 1 10.407-3.548 23.838 23.838 0 0 0-1.012-5.434m-15.482 0A23.94 23.94 0 0 1 12 9.69a23.94 23.94 0 0 1 7.74.457M12 2.25A2.25 2.25 0 0 0 9.75 4.5v.656" />
                        </svg>
                        <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Certifications ({profile.resume_certifications.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {profile.resume_certifications.map((c, i) => (
                          <div key={i} className="px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-3">
                            <span className="text-lg">🏅</span>
                            <div>
                              <p className="text-amber-300 text-sm font-medium">{c.name}</p>
                              {c.issuer && <p className="text-slate-500 text-xs">{c.issuer}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Skill Progress Bars (full width below) ─── */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mt-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <SectionHeader icon="chart" title="Skill Analysis" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mt-4">
                  {skillBars.map((skill) => (
                    <div key={skill.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-300 text-xs font-medium">{skill.label}</span>
                        <span className="text-slate-400 text-xs font-bold">
                          {skill.value}{skill.max === 10 ? "/10" : "%"}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-700`}
                          style={{ width: `${Math.min((skill.value / skill.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Resources Section (full width) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-fade-in-up" style={{ animationDelay: "0.26s" }}>
                <ResourceCard
                  title="LeetCode"
                  desc="Practice DSA problems by topic and difficulty"
                  color="from-amber-500 to-orange-500"
                  icon="code"
                />
                <ResourceCard
                  title="GitHub Profile"
                  desc="Maintain active repos, contribute to open source"
                  color="from-slate-400 to-slate-500"
                  icon="github"
                />
                <ResourceCard
                  title="Mock Interviews"
                  desc="Practice with peers on Pramp & InterviewBit"
                  color="from-emerald-500 to-teal-500"
                  icon="people"
                />
                <ResourceCard
                  title="System Design"
                  desc="Learn HLD & LLD for senior roles"
                  color="from-violet-500 to-fuchsia-500"
                  icon="brain"
                />
              </div>
            </>
          )}
        </div>
  );
}

/* ═══════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════ */

const ICON_PATHS = {
  academic: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />,
  github: <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />,
  code: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />,
  brain: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />,
  folder: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />,
  briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />,
  user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />,
  checklist: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  lightbulb: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />,
  chart: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />,
  star: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />,
  book: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />,
  target: <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />,
  chat: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />,
  people: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />,
};

const ACCENT_CONFIG = {
  violet: { bg: "bg-violet-500/10", stroke: "#a78bfa", hover: "group-hover:bg-violet-500/15" },
  pink: { bg: "bg-pink-500/10", stroke: "#f472b6", hover: "group-hover:bg-pink-500/15" },
  cyan: { bg: "bg-cyan-500/10", stroke: "#22d3ee", hover: "group-hover:bg-cyan-500/15" },
  amber: { bg: "bg-amber-500/10", stroke: "#fbbf24", hover: "group-hover:bg-amber-500/15" },
  emerald: { bg: "bg-emerald-500/10", stroke: "#34d399", hover: "group-hover:bg-emerald-500/15" },
  indigo: { bg: "bg-indigo-500/10", stroke: "#818cf8", hover: "group-hover:bg-indigo-500/15" },
};

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
        {ICON_PATHS[icon]}
      </svg>
      <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">{title}</h3>
    </div>
  );
}

function StatCard({ label, value, icon, accent = "violet" }) {
  const a = ACCENT_CONFIG[accent] || ACCENT_CONFIG.violet;
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 transition-all duration-200 hover:border-slate-700 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] group">
      <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center shrink-0 ${a.hover} transition-colors`}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={a.stroke} strokeWidth="1.5">
          {ICON_PATHS[icon]}
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-base leading-tight">{value}</span>
        <span className="text-slate-400 text-[0.7rem] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function GridItem({ label, value }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 bg-[#0a0f1e] rounded-lg text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-semibold">{value}</span>
    </div>
  );
}

function TipItem({ tip, index }) {
  return (
    <li className="flex gap-3 items-start animate-fade-in" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
          {ICON_PATHS[tip.icon] || ICON_PATHS.star}
        </svg>
      </div>
      <p className="m-0 text-slate-400 text-xs leading-relaxed">{tip.text}</p>
    </li>
  );
}

function ResourceCard({ title, desc, color, icon }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 transition-all duration-200 hover:border-slate-700 hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)] group cursor-default">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 opacity-80 group-hover:opacity-100 transition-opacity`}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.5">
          {ICON_PATHS[icon]}
        </svg>
      </div>
      <h4 className="text-white text-sm font-semibold mb-1">{title}</h4>
      <p className="text-slate-400 text-xs leading-relaxed m-0">{desc}</p>
    </div>
  );
}
