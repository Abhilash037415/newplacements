import { useState } from "react";
import { adminLogin } from "../api/api";

export default function OfficerLogin({ onLogin, switchToStudentLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminLogin({ email, password });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Admin Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] relative overflow-hidden px-4">
      <div className="absolute top-[-120px] left-[-100px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(239,68,68,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-red-900/60 rounded-2xl px-10 py-11 w-full max-w-[430px] shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(239,68,68,0.1)]">
        
        <div className="w-13 h-13 rounded-xl bg-red-500/10 flex items-center justify-center mb-5">
           <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
           </svg>
        </div>

        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Officer Portal</h2>
        <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mb-2" />
        <p className="text-slate-400 text-sm mb-8">Secure access for Placement Officers only.</p>

        {error && (
          <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Officer Code / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@placement.com"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Secret Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-3 border-none rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold cursor-pointer shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Authorize Login"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-400 text-sm">
          Not an officer?{" "}
          <span onClick={switchToStudentLogin} className="text-red-400 font-semibold cursor-pointer hover:underline">
            Student Login
          </span>
        </p>
      </div>
    </div>
  );
}
