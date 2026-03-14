import { useState } from "react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "edit", label: "Profile", icon: "user" },
  { key: "dsa", label: "DSA Analysis", icon: "chart" },
  { key: "roadmap", label: "Roadmap", icon: "map" },
  { key: "interview", label: "Mock Interview", icon: "interview" },
];

const NAV_ICONS = {
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  ),
  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  ),
  map: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 6.75V15m0 0-3 3m3-3 3 3m-8.25 0h13.5A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Zm13.5-9H6.75"
    />
  ),
  chart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
    />
  ),
  interview: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18.75a6 6 0 0 0 6-6V6.75a6 6 0 1 0-12 0v6a6 6 0 0 0 6 6Zm0 0v2.25m-4.5 0h9"
    />
  ),
};

export default function Navbar({ user, currentView, onNavigate, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between px-7 py-3 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight">
        <svg
          width="28"
          height="28"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#a78bfa"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
          />
        </svg>
        <span>PlacementReady</span>
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border border-transparent ${
              currentView === item.key
                ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {NAV_ICONS[item.icon]}
            </svg>
            {item.label}
          </button>
        ))}
      </div>

      {/* User + Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-bold text-xs flex items-center justify-center">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <span className="text-slate-400 text-sm">
            {user.name || user.email}
          </span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-transparent rounded-lg bg-transparent text-slate-400 text-xs cursor-pointer transition-all duration-200 hover:text-white hover:bg-slate-800 hover:border-slate-700"
          onClick={onLogout}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          Logout
        </button>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0a0f1e]/95 backdrop-blur-xl border-b border-slate-800 py-2 px-4 md:hidden animate-fade-in">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === item.key
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {NAV_ICONS[item.icon]}
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
