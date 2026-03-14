import { useState } from "react";
import { updateProfile, uploadResume, getLeetcodeStats, getCodechefStats } from "../api/api";

const INITIAL = {
  cgpa: "",
  internships: "",
  projects_count: "",
  github_username: "",
  leetcode_username: "",
  codechef_username: "",
  aptitude_score: "",
  communication_score: "",
  attendance_percentage: "",
  certifications_count: "",
};

export default function ProfileForm({ userId, existingProfile, onSaved }) {
  const [form, setForm] = useState(() => {
    if (existingProfile) {
      const merged = { ...INITIAL };
      for (const key of Object.keys(INITIAL)) {
        if (existingProfile[key] !== undefined && existingProfile[key] !== null) {
          merged[key] = String(existingProfile[key]);
        }
      }
      return merged;
    }
    return { ...INITIAL };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState(existingProfile?.extracted_skills || []);
  const [manualSkills, setManualSkills] = useState(existingProfile?.manual_skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [resumeProjects, setResumeProjects] = useState(existingProfile?.resume_projects || []);
  const [resumeCerts, setResumeCerts] = useState(existingProfile?.resume_certifications || []);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");
  const [lcFetching, setLcFetching] = useState(false);
  const [lcData, setLcData] = useState(null);
  const [ccFetching, setCcFetching] = useState(false);
  const [ccData, setCcData] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ── Resume Upload ── */
  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setResumeUploading(true);
    setResumeMsg("");
    try {
      const res = await uploadResume(userId, resumeFile);
      const data = res.data;
      setSkills(data.skills || []);
      const projects = data.projects || [];
      const certs = data.certifications || [];
      setResumeProjects(projects);
      setResumeCerts(certs);

      // Auto-fill project count and cert count from extracted data
      if (projects.length > 0) {
        setForm((prev) => ({
          ...prev,
          projects_count: String(Math.max(Number(prev.projects_count) || 0, projects.length)),
        }));
      }
      if (certs.length > 0) {
        setForm((prev) => ({
          ...prev,
          certifications_count: String(Math.max(Number(prev.certifications_count) || 0, certs.length)),
        }));
      }

      const parts = [];
      if (data.skills?.length) parts.push(`${data.skills.length} skills`);
      if (projects.length) parts.push(`${projects.length} projects`);
      if (certs.length) parts.push(`${certs.length} certifications`);
      setResumeMsg(`Extracted ${parts.join(", ")} from resume`);
    } catch (err) {
      setResumeMsg(err.response?.data?.error || "Failed to process resume");
    } finally {
      setResumeUploading(false);
    }
  };

  /* ── Fetch LeetCode Stats ── */
  const handleFetchLeetcode = async () => {
    if (!form.leetcode_username.trim()) return;
    setLcFetching(true);
    try {
      const res = await getLeetcodeStats(form.leetcode_username.trim());
      setLcData(res.data);
      setForm((prev) => ({ ...prev, leetcode_rating: String(res.data.rating || 0) }));
    } catch (err) {
      setLcData({ error: err.response?.data?.error || "Failed to fetch" });
    } finally {
      setLcFetching(false);
    }
  };

  /* ── Fetch CodeChef Stats ── */
  const handleFetchCodechef = async () => {
    if (!form.codechef_username.trim()) return;
    setCcFetching(true);
    try {
      const res = await getCodechefStats(form.codechef_username.trim());
      setCcData(res.data);
      setForm((prev) => ({ ...prev, codechef_rating: String(res.data.rating || 0) }));
    } catch (err) {
      setCcData({ error: err.response?.data?.error || "Failed to fetch" });
    } finally {
      setCcFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        user_id: userId,
        extracted_skills: skills,
        manual_skills: manualSkills,
        resume_projects: resumeProjects,
        resume_certifications: resumeCerts,
      };
      const res = await updateProfile(payload);
      onSaved(res.data.profile);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = (index) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const removeManualSkill = (index) => {
    setManualSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddManualSkill = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim().replace(/,$/g, "");
      if (val && !manualSkills.some((s) => s.toLowerCase() === val.toLowerCase()) && !skills.some((s) => s.toLowerCase() === val.toLowerCase())) {
        setManualSkills((prev) => [...prev, val]);
      }
      setSkillInput("");
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all duration-200 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/12 placeholder:text-slate-500";
  const fetchBtnClass = "px-3 py-2.5 border border-slate-600 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition-all duration-200 hover:border-violet-500 hover:text-violet-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  return (
    <div className="max-w-[820px] mx-auto">
      <h2 className="text-white text-xl font-bold tracking-tight mb-1">Update Profile</h2>
      <div className="w-9 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-5" />

      {error && (
        <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-700/15 text-blue-300 px-4 py-3 rounded-xl mb-5 text-sm border border-blue-700/30 text-center flex items-center justify-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin-fast" />
          Evaluating your profile with AI... This may take a moment.
        </div>
      )}

      {/* ── Resume Upload Section ── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Resume Upload</h3>
        </div>
        <p className="text-slate-500 text-xs mb-3">Upload your PDF resume to auto-extract skills, projects & certifications</p>
        <div className="flex items-center gap-3">
          <label className="flex-1 relative">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className={`px-4 py-2.5 border border-dashed rounded-xl text-xs text-center cursor-pointer transition-all duration-200 ${resumeFile ? "border-violet-500 bg-violet-500/5 text-violet-300" : "border-slate-600 text-slate-500 hover:border-slate-500"}`}>
              {resumeFile ? resumeFile.name : "Choose PDF file..."}
            </div>
          </label>
          <button
            type="button"
            onClick={handleResumeUpload}
            disabled={!resumeFile || resumeUploading}
            className={fetchBtnClass}
          >
            {resumeUploading ? "Extracting..." : "Parse Resume"}
          </button>
        </div>
        {resumeMsg && (
          <p className={`mt-2 text-xs ${resumeMsg.includes("Failed") || resumeMsg.includes("Could not") ? "text-red-400" : "text-emerald-400"}`}>
            {resumeMsg}
          </p>
        )}

        {/* Extracted skills tags */}
        {skills.length > 0 && (
          <div className="mt-3">
            <p className="text-slate-400 text-xs mb-2">Extracted Skills ({skills.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-500/20 group"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-violet-400 hover:text-red-400 cursor-pointer bg-transparent border-none p-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Manual skill input */}
        <div className="mt-3">
          <p className="text-slate-400 text-xs mb-2">Add Skills Manually:</p>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleAddManualSkill}
            placeholder="Type a skill and press Enter or comma..."
            className="w-full px-3 py-2 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-xs outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/12 placeholder:text-slate-500"
          />
          {manualSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {manualSkills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20 group"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeManualSkill(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-emerald-400 hover:text-red-400 cursor-pointer bg-transparent border-none p-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Parsed Projects ── */}
      {resumeProjects.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Projects from Resume ({resumeProjects.length})</h3>
          </div>
          <div className="space-y-2.5">
            {resumeProjects.map((p, i) => (
              <div key={i} className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <p className="text-blue-300 text-sm font-semibold">{p.name}</p>
                {p.description && <p className="text-slate-400 text-xs mt-1">{p.description}</p>}
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

      {/* ── Parsed Certifications ── */}
      {resumeCerts.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.838 23.838 0 0 0-1.012 5.434c3.58.845 7.064 2.04 10.407 3.548a47.542 47.542 0 0 1 10.407-3.548 23.838 23.838 0 0 0-1.012-5.434m-15.482 0A23.94 23.94 0 0 1 12 9.69a23.94 23.94 0 0 1 7.74.457M12 2.25A2.25 2.25 0 0 0 9.75 4.5v.656" />
            </svg>
            <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Certifications from Resume ({resumeCerts.length})</h3>
          </div>
          <div className="space-y-2">
            {resumeCerts.map((c, i) => (
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-5">
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">CGPA</label>
            <input name="cgpa" type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={handleChange} required placeholder="e.g. 8.5" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Internships</label>
            <input name="internships" type="number" min="0" value={form.internships} onChange={handleChange} required placeholder="e.g. 2" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Projects Count</label>
            <input name="projects_count" type="number" min="0" value={form.projects_count} onChange={handleChange} required placeholder="e.g. 5" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">
              GitHub Username <span className="text-rose-400">*</span>
            </label>
            <input name="github_username" type="text" value={form.github_username} onChange={handleChange} required placeholder="e.g. octocat" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Aptitude Score</label>
            <input name="aptitude_score" type="number" min="0" max="100" value={form.aptitude_score} onChange={handleChange} required placeholder="0-100" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Communication Score</label>
            <input name="communication_score" type="number" min="0" max="100" value={form.communication_score} onChange={handleChange} required placeholder="0-100" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Attendance %</label>
            <input name="attendance_percentage" type="number" min="0" max="100" value={form.attendance_percentage} onChange={handleChange} required placeholder="0-100" className={inputClass} />
          </div>
          <div>
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Certifications Count</label>
            <input name="certifications_count" type="number" min="0" value={form.certifications_count} onChange={handleChange} placeholder="e.g. 3" className={inputClass} />
          </div>
        </div>

        {/* ── LeetCode Section ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">LeetCode</h3>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <div className="flex-1">
              <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">LeetCode Username</label>
              <input name="leetcode_username" type="text" value={form.leetcode_username} onChange={handleChange} placeholder="e.g. leetcoder123" className={inputClass} />
            </div>
            <button type="button" onClick={handleFetchLeetcode} disabled={lcFetching || !form.leetcode_username.trim()} className={fetchBtnClass}>
              {lcFetching ? "Fetching..." : "Fetch Stats"}
            </button>
          </div>
          {lcData && !lcData.error && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat label="Rating" value={lcData.rating} color="amber" />
              <MiniStat label="Solved" value={lcData.problems_solved} color="emerald" />
              <MiniStat label="Easy" value={lcData.easy_solved} color="cyan" />
              <MiniStat label="Medium" value={lcData.medium_solved} color="amber" />
              <MiniStat label="Hard" value={lcData.hard_solved} color="rose" />
              <MiniStat label="Contests" value={lcData.contests_attended} color="violet" />
              <MiniStat label="Ranking" value={lcData.ranking ? `#${lcData.ranking.toLocaleString()}` : "N/A"} color="indigo" />
            </div>
          )}
          {lcData?.error && <p className="text-red-400 text-xs mt-1">{lcData.error}</p>}
          {lcData && !lcData.error && lcData.dsa_analysis && (
            <div className="mt-3">
              <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">DSA Topic Preview</p>
              <div className="flex flex-wrap gap-1.5">
                {(lcData.dsa_analysis.strong || []).map((t) => (
                  <span key={t.topic} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[0.65rem] font-medium border border-emerald-500/20">
                    {t.topic} ({t.solved})
                  </span>
                ))}
                {(lcData.dsa_analysis.weak || []).map((t) => (
                  <span key={t.topic} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 text-[0.65rem] font-medium border border-rose-500/20">
                    {t.topic} ({t.solved})
                  </span>
                ))}
                {(lcData.dsa_analysis.not_attempted || []).slice(0, 5).map((t) => (
                  <span key={t.topic} className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 text-[0.65rem] font-medium border border-slate-500/20">
                    {t.topic} (0)
                  </span>
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-[0.6rem] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"/>Strong</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"/>Weak</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"/>Not Attempted</span>
              </div>
            </div>
          )}
        </div>

        {/* ── CodeChef Section ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">CodeChef</h3>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <div className="flex-1">
              <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">CodeChef Username</label>
              <input name="codechef_username" type="text" value={form.codechef_username} onChange={handleChange} placeholder="e.g. chef_coder" className={inputClass} />
            </div>
            <button type="button" onClick={handleFetchCodechef} disabled={ccFetching || !form.codechef_username.trim()} className={fetchBtnClass}>
              {ccFetching ? "Fetching..." : "Fetch Stats"}
            </button>
          </div>
          {ccData && !ccData.error && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat label="Rating" value={ccData.rating} color="emerald" />
              <MiniStat label="Highest" value={ccData.highest_rating} color="amber" />
              <MiniStat label="Stars" value={`${ccData.stars}★`} color="yellow" />
              <MiniStat label="Solved" value={ccData.problems_solved} color="cyan" />
              <MiniStat label="Global Rank" value={ccData.global_rank ? `#${ccData.global_rank.toLocaleString()}` : "N/A"} color="violet" />
            </div>
          )}
          {ccData?.error && <p className="text-red-400 text-xs mt-1">{ccData.error}</p>}
        </div>

        {/* ── Coding Score (auto-computed, read-only) ── */}
        {existingProfile?.coding_score != null && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              </svg>
              <h3 className="m-0 text-xs text-slate-400 uppercase tracking-widest font-semibold">Coding Score</h3>
              <span className="ml-auto text-[0.6rem] text-slate-500 italic">Auto-computed from LeetCode & CodeChef</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {existingProfile.coding_score}
              </div>
              <div className="flex-1">
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, existingProfile.coding_score)}%` }}
                  />
                </div>
                <p className="text-slate-500 text-[0.6rem] mt-1">Based on platform ratings & problems solved</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 mt-2 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

function MiniStat({ label, value, color = "violet" }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-300",
    amber: "bg-amber-500/10 text-amber-300",
    emerald: "bg-emerald-500/10 text-emerald-300",
    cyan: "bg-cyan-500/10 text-cyan-300",
    rose: "bg-rose-500/10 text-rose-300",
    indigo: "bg-indigo-500/10 text-indigo-300",
    yellow: "bg-yellow-500/10 text-yellow-300",
  };
  const cls = colors[color] || colors.violet;
  return (
    <div className={`flex flex-col items-center px-3 py-2.5 rounded-lg ${cls}`}>
      <span className="text-sm font-bold">{value ?? "—"}</span>
      <span className="text-[0.65rem] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}
