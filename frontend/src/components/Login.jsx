import { useState } from "react";
import { loginUser } from "../api/api";

export default function Login({ onLogin, switchToRegister, switchToOfficer }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] relative overflow-hidden px-4">
      {/* Background decorative elements */}
      <div className="absolute top-[-120px] right-[-100px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,transparent_70%)] pointer-events-none" />

      <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-2xl px-10 py-11 w-full max-w-[430px] shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.08)] animate-fade-in-up">
        {/* Icon */}
        <div className="w-13 h-13 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5">
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Welcome back</h2>
        <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-2" />
        <p className="text-slate-400 text-sm mb-8">Sign in to your Placement Readiness account</p>

        {error && (
          <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all duration-200 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/15 placeholder:text-slate-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all duration-200 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/15 placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-3 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-400 text-sm">
          Don't have an account?{" "}
          <span onClick={switchToRegister} className="text-violet-400 font-semibold cursor-pointer hover:text-violet-300 hover:underline transition-colors">
            Create one
          </span>
        </p>
        
        <p className="text-center mt-4 text-slate-600 text-xs font-medium">
          Placement Admin?{" "}
          <span onClick={switchToOfficer} className="text-slate-400 font-semibold cursor-pointer hover:text-slate-300 transition-colors">
            Officer Portal
          </span>
        </p>
      </div>
    </div>
  );
}
