import { useEffect, useMemo, useRef, useState } from "react";

const ROLE_OPTIONS = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Analyst",
  "Machine Learning Engineer",
  "QA Engineer",
  "Product Engineer",
];

const EXPERIENCE_OPTIONS = ["intern", "junior", "mid", "senior"];
const DURATION_OPTIONS = [5, 10, 15];

export default function MockInterviewSetup({ user, onStart, onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [experienceLevel, setExperienceLevel] = useState("junior");
  const [duration, setDuration] = useState(10);
  const [deviceState, setDeviceState] = useState({
    checking: false,
    mic: false,
    camera: false,
    error: "",
  });

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const canStart = useMemo(
    () => deviceState.mic && deviceState.camera,
    [deviceState],
  );

  const handleDeviceCheck = async () => {
    setDeviceState({ checking: true, mic: false, camera: false, error: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const micEnabled = stream
        .getAudioTracks()
        .some((track) => track.readyState === "live");
      const camEnabled = stream
        .getVideoTracks()
        .some((track) => track.readyState === "live");
      setDeviceState({
        checking: false,
        mic: micEnabled,
        camera: camEnabled,
        error: "",
      });
    } catch (error) {
      setDeviceState({
        checking: false,
        mic: false,
        camera: false,
        error: error?.message || "Unable to access microphone and camera.",
      });
    }
  };

  const handleStart = () => {
    onStart({ role, experienceLevel, duration });
  };

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8 pb-12 animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-400/80 mb-2">
            AI Mock Interview
          </p>
          <h2 className="text-white text-3xl font-bold tracking-tight">
            Interview Setup
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            Configure the role, verify your microphone and camera, then launch a
            live AI-led mock interview session.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-sm hover:border-slate-500 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
          <div className="mb-6">
            <p className="text-slate-500 text-xs uppercase tracking-[0.25em] mb-2">
              Candidate
            </p>
            <h3 className="text-white text-xl font-semibold">
              {user?.name || user?.email}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              A focused interview flow with live transcription, voice analysis,
              and face metrics.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Job Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="interview-input"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Experience Level">
              <div className="grid grid-cols-2 gap-2">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setExperienceLevel(option)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-all ${experienceLevel === option ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Interview Duration">
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDuration(option)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-all ${duration === option ? "border-violet-400 bg-violet-400/10 text-violet-300" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}
                  >
                    {option} min
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08111f] p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-slate-300 text-sm font-semibold">
                  Mic + Camera Check
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Grant access and confirm both devices are live before
                  starting.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeviceCheck}
                disabled={deviceState.checking}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-sm font-semibold disabled:opacity-60"
              >
                {deviceState.checking ? "Checking..." : "Run Check"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatusCard label="Microphone" ok={deviceState.mic} />
              <StatusCard label="Camera" ok={deviceState.camera} />
            </div>

            {deviceState.error && (
              <p className="mt-3 text-sm text-rose-400">{deviceState.error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Live Interview
          </button>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[linear-gradient(135deg,rgba(6,11,24,0.98),rgba(15,23,42,0.92))] p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.12),transparent_34%)] pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] gap-6 h-full">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 min-h-[380px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-300 text-sm font-semibold">
                  Camera Preview
                </p>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${canStart ? "bg-emerald-500/12 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${canStart ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
                  />
                  {canStart ? "Ready" : "Waiting"}
                </span>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.55),rgba(2,6,23,1))]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between">
              <div>
                <p className="text-slate-300 text-sm font-semibold mb-2">
                  Interview Plan
                </p>
                <div className="space-y-3 text-sm text-slate-400">
                  <PlanRow label="Style" value="HR + Technical" />
                  <PlanRow label="Difficulty" value="Gradually increasing" />
                  <PlanRow
                    label="Question Count"
                    value={
                      duration === 5
                        ? "3 questions"
                        : duration === 10
                          ? "5 questions"
                          : "8 questions"
                    }
                  />
                  <PlanRow label="Analysis" value="Face, confidence, fluency" />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-4 mt-6">
                <p className="text-cyan-300 text-sm font-medium">
                  Before you begin
                </p>
                <ul className="mt-3 space-y-2 text-xs text-slate-300">
                  <li>
                    Answer naturally and keep your face within the webcam frame.
                  </li>
                  <li>
                    Use concise examples with impact, tradeoffs, and outcomes.
                  </li>
                  <li>Keep your microphone close enough for clear capture.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusCard({ label, ok }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${ok ? "border-emerald-500/25 bg-emerald-500/8" : "border-slate-700 bg-slate-900/70"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-300">{label}</span>
        <span
          className={`text-xs font-semibold ${ok ? "text-emerald-300" : "text-slate-500"}`}
        >
          {ok ? "Detected" : "Not Ready"}
        </span>
      </div>
    </div>
  );
}

function PlanRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
      <span>{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
