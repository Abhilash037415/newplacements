import { useState } from "react";
import Dashboard from "./components/Dashboard";
import DSAAnalysis from "./components/DSAAnalysis";
import LearningRoadmap from "./components/LearningRoadmap";
import Login from "./components/Login";
import MockInterviewReport from "./components/MockInterviewReport";
import MockInterviewSession from "./components/MockInterviewSession";
import MockInterviewSetup from "./components/MockInterviewSetup";
import Navbar from "./components/Navbar";
import OfficerDashboard from "./components/OfficerDashboard";
import OfficerLogin from "./components/OfficerLogin";
import Register from "./components/Register";

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState("login");
  const [view, setView] = useState("dashboard");
  const [interviewConfig, setInterviewConfig] = useState(null);
  const [interviewReport, setInterviewReport] = useState(null);

  const handleAuth = (userData) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const resetInterviewFlow = () => {
    setInterviewConfig(null);
    setInterviewReport(null);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
    setPage("login");
    setView("dashboard");
    resetInterviewFlow();
  };

  if (user) {
    if (user.role === "officer") {
      return <OfficerDashboard user={user} onLogout={handleLogout} />;
    }

    return (
      <div className="min-h-screen bg-[#0a0f1e]">
        <Navbar
          user={user}
          currentView={view}
          onNavigate={(nextView) => {
            setView(nextView);
            if (nextView !== "interview") {
              resetInterviewFlow();
            }
          }}
          onLogout={handleLogout}
        />
        {view === "interview" ? (
          interviewReport ? (
            <MockInterviewReport
              report={interviewReport}
              onRestart={() => {
                setInterviewReport(null);
                setInterviewConfig(null);
              }}
              onBack={() => {
                resetInterviewFlow();
                setView("dashboard");
              }}
            />
          ) : interviewConfig ? (
            <MockInterviewSession
              config={interviewConfig}
              onComplete={(report) => setInterviewReport(report)}
              onExit={() => {
                resetInterviewFlow();
                setView("dashboard");
              }}
            />
          ) : (
            <MockInterviewSetup
              user={user}
              onStart={(config) => setInterviewConfig(config)}
              onBack={() => setView("dashboard")}
            />
          )
        ) : view === "roadmap" ? (
          <LearningRoadmap userId={user.id} />
        ) : view === "dsa" ? (
          <div className="px-5 py-8">
            <DSAAnalysis userId={user.id} />
          </div>
        ) : (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            currentView={view}
            onNavigate={setView}
          />
        )}
      </div>
    );
  }

  if (page === "register") {
    return (
      <Register
        onRegister={handleAuth}
        switchToLogin={() => setPage("login")}
      />
    );
  }

  if (page === "officer_login") {
    return (
      <OfficerLogin
        onLogin={handleAuth}
        switchToStudentLogin={() => setPage("login")}
      />
    );
  }

  return (
    <Login
      onLogin={handleAuth}
      switchToRegister={() => setPage("register")}
      switchToOfficer={() => setPage("officer_login")}
    />
  );
}

export default App;
