import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { getAdminStudents, getAdminLeaderboard, getAnnouncements, createAnnouncement, getProfile } from "../api/api";

function StudentDataList({ onViewProfile }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStudents().then((res) => {
      setStudents(res.data.students || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-slate-400 p-8 text-center animate-pulse">Loading student database...</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-300 text-sm font-semibold border-b border-slate-800">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">CGPA</th>
              <th className="px-6 py-4 text-center">Placement Score</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {students.map((student, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-slate-300 text-sm">
                <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                <td className="px-6 py-4 text-slate-400">{student.email}</td>
                <td className="px-6 py-4">{student.cgpa || "N/A"}</td>
                <td className="px-6 py-4 text-center">
                  {student.placement_score !== "Not Predicted" ? (
                    <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {student.placement_score}%
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">Not Available</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                   <button
                    onClick={() => onViewProfile(student.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                   >
                     View Profile
                   </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No students registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

StudentDataList.propTypes = {
  onViewProfile: PropTypes.func.isRequired,
};

function LeaderboardList() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminLeaderboard().then((res) => {
      setLeaders(res.data.leaderboard || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-slate-400 p-8 text-center animate-pulse">Computing rankings...</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-300 text-sm font-semibold border-b border-slate-800">
              <th className="px-6 py-4 text-center w-20">Rank</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Github Rank</th>
              <th className="px-6 py-4 text-right">Readiness Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {leaders.map((student, idx) => (
              <tr key={idx} className={`hover:bg-slate-800/30 transition-colors text-slate-300 text-sm ${idx < 3 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-6 py-4 text-center">
                  {idx === 0 ? <span className="text-2xl" title="Rank 1">🥇</span> : 
                   idx === 1 ? <span className="text-2xl" title="Rank 2">🥈</span> :
                   idx === 2 ? <span className="text-2xl" title="Rank 3">🥉</span> :
                   <span className="font-semibold text-slate-500">#{idx + 1}</span>}
                </td>
                <td className="px-6 py-4 font-bold text-white tracking-wide">{student.name}</td>
                <td className="px-6 py-4">@{student.github}</td>
                <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center justify-center px-3 py-1 text-sm font-bold rounded-full border ${idx < 3 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                      {student.score}%
                    </span>
                </td>
              </tr>
            ))}
            {leaders.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No predictions made yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnnouncementsAdminView() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setPosting(true);
    setError("");
    try {
      await createAnnouncement({ title, message });
      setTitle("");
      setMessage("");
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Announcement Form */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
          <h3 className="text-xl font-bold text-white mb-4">Post Announcement</h3>
          {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-900/50">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Announcement Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Upcoming Mock Interviews"
                className="w-full bg-[#0a0f1e] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Message Content</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the announcement details..."
                className="w-full bg-[#0a0f1e] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all min-h-[150px] resize-y"
                required
              />
            </div>
            <button
              type="submit"
              disabled={posting || !title.trim() || !message.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {posting ? "Posting..." : "Broadcast to Students"}
            </button>
          </form>
        </div>
      </div>

      {/* Announcements List */}
      <div className="lg:col-span-2">
        <h3 className="text-xl font-bold text-white mb-4">Recent Announcements</h3>
        {loading ? (
          <div className="text-slate-400 p-8 text-center animate-pulse border border-slate-800 rounded-2xl bg-slate-900/50">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-slate-500 p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/50 border-dashed">
            No announcements posted yet. Create one to inform students.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-white leading-tight">{ann.title}</h4>
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap ml-4 bg-slate-800/50 px-2.5 py-1 rounded-md">
                    {new Date(ann.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{ann.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

AdminStudentProfileView.propTypes = {
  studentId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

function AdminStudentProfileView({ studentId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(studentId)
      .then((res) => {
        setProfile(res.data.profile);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p>Loading student profile data...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
        <h3 className="text-lg text-slate-300 mb-4">Profile Not Found</h3>
        <p className="text-slate-500 text-sm mb-6">This student has not completed their profile setup yet.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          title="Back to Directory"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h3 className="text-2xl font-bold text-white">Student Profile Detail</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 md:col-span-1">
           <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">CGPA</p>
           <p className="text-3xl font-bold text-white flex items-baseline gap-1">
             {profile.cgpa} <span className="text-sm font-normal text-slate-500">/ 10</span>
           </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 md:col-span-1">
           <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Readiness Score</p>
           <p className="text-3xl font-bold text-emerald-400">
             {profile.placement_score ? `${profile.placement_score}%` : 'N/A'}
           </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 md:col-span-2">
           <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Github Identity</p>
           <p className="text-lg font-bold text-slate-200">
             {profile.github_username ? `@${profile.github_username}` : 'Not Linked'}
           </p>
           {profile.github_verified && (
             <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
               Verified Profile
             </span>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-800 pb-2">Skill Scores</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Coding</span>
                <span className="text-cyan-400 font-bold">{profile.coding_score || 0}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${profile.coding_score || 0}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Aptitude</span>
                <span className="text-amber-400 font-bold">{profile.aptitude_score || 0}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${profile.aptitude_score || 0}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Communication</span>
                <span className="text-emerald-400 font-bold">{profile.communication_score || 0}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${profile.communication_score || 0}%` }}></div></div>
            </div>
            <div>
               <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Attendance</span>
                <span className="text-violet-400 font-bold">{profile.attendance_percentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${profile.attendance_percentage || 0}%` }}></div></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-800 pb-2">Experience & Projects</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Internships Completed</span>
              <span className="text-white font-bold bg-slate-800 px-3 py-1 rounded-md">{profile.internships || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Projects Built</span>
              <span className="text-white font-bold bg-slate-800 px-3 py-1 rounded-md">{profile.projects_count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Certifications</span>
              <span className="text-white font-bold bg-slate-800 px-3 py-1 rounded-md">{profile.certifications_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resume Projects Display if available */}
      {profile.resume_projects && profile.resume_projects.length > 0 && (
         <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mt-4">
           <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-800 pb-2">Extracted Projects from Resume</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {profile.resume_projects.map((proj, i) => (
                <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                  <h5 className="font-semibold text-white text-sm mb-1">{proj.name}</h5>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">{proj.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(proj.technologies || []).slice(0, 3).map((tech, j) => (
                      <span key={j} className="text-[10px] bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">{tech}</span>
                    ))}
                  </div>
                </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
}

AdminStudentProfileView.propTypes = {
  studentId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default function OfficerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("students");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const handleViewProfile = (studentId) => {
    setSelectedStudentId(studentId);
  };

  const handleBackToDirectory = () => {
    setSelectedStudentId(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      {/* Admin Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Placement Admin Portal</h1>
              <p className="text-xs text-red-400 font-medium tracking-wider uppercase">Executive Access</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-slate-400">{user.email}</span>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            {activeTab === 'students' ? 'Student Directory' : activeTab === 'leader' ? 'Global Leaderboard' : 'Student Communication Center'}
          </h2>
          
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700 rounded-xl">
            <button 
              onClick={() => { setActiveTab('students'); setSelectedStudentId(null); }}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'students' && !selectedStudentId ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              All Students
            </button>
            <button 
              onClick={() => { setActiveTab('leader'); setSelectedStudentId(null); }}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'leader' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Leaderboard
            </button>
            <button 
              onClick={() => { setActiveTab('announcements'); setSelectedStudentId(null); }}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'announcements' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Announcements
            </button>
          </div>
        </div>

        {selectedStudentId ? (
          <AdminStudentProfileView studentId={selectedStudentId} onBack={handleBackToDirectory} />
        ) : activeTab === 'students' ? (
          <StudentDataList onViewProfile={handleViewProfile} />
        ) : activeTab === 'leader' ? (
          <LeaderboardList />
        ) : (
          <AnnouncementsAdminView />
        )}
      </div>
    </div>
  );
}

OfficerDashboard.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
