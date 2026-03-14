import { useState } from "react";
import { registerUser } from "../api/api";

export default function Register({ onRegister, switchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await registerUser({ name, email, password });
      onRegister(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Create account</h2>
        <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 mb-2" />
        <p className="text-slate-400 text-sm mb-8">Get started with Placement Readiness</p>

        {error && (
          <div className="bg-red-900/25 text-red-300 px-3.5 py-2.5 rounded-xl mb-4 text-sm border border-red-900/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1.5 text-slate-300 text-xs font-semibold tracking-wide">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all duration-200 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/15 placeholder:text-slate-500"
            />
          </div>
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
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2.5 border border-slate-600 rounded-xl bg-[#0a0f1e] text-slate-100 text-sm outline-none transition-all duration-200 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/15 placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-3 border-none rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-400 text-sm">
          Already have an account?{" "}
          <span onClick={switchToLogin} className="text-violet-400 font-semibold cursor-pointer hover:text-violet-300 hover:underline transition-colors">
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
