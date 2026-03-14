import { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data;
}

async function apiPostForm(path, formData) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data;
}

export default function MockInterviewSession({ config, onComplete, onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechRecRef = useRef(null);
  const speechTranscriptRef = useRef({ final: "", interim: "" });
  const isRecordingRef = useRef(false);
  const sessionIdRef = useRef("");
  const busyRef = useRef(true);

  const [sessionId, setSessionId] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState({ confidence: 50, engagement: 50, fluency: 50 });
  const [faceMetrics, setFaceMetrics] = useState({ eyeContact: 50, gazeStability: 50, engagement: 50, faceConfidence: 50, framesDetected: 0, provider: "" });
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState("Preparing...");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Keep refs in sync with state
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Elapsed timer
  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [sessionId]);

  // Speech recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let finalText = speechTranscriptRef.current.final;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const chunk = r?.[0]?.transcript || "";
        if (!chunk.trim()) continue;
        if (r.isFinal) finalText = `${finalText} ${chunk}`.trim();
        else interim = `${interim} ${chunk}`.trim();
      }
      speechTranscriptRef.current = { final: finalText, interim };
      setLiveTranscript(finalText);
      setInterimTranscript(interim);

      // Reset silence timer on new speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current && !busyRef.current) {
          stopRecording();
        }
      }, 2000);
    };
    rec.onerror = () => {};
    rec.onend = () => {};
    speechRecRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ok */ }
      speechRecRef.current = null;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start camera + interview on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        setStatus("Starting interview...");
        const data = await apiPost("/interview/start", {
          role: config.role,
          experience_level: config.experienceLevel,
          duration: config.duration,
        });

        if (!active) return;
        setSessionId(data.session_id);
        setCurrentQuestion(data.question_text);
        setHistory([{ type: "question", text: data.question_text }]);
        setStatus("AI is asking the first question...");
        playAndRecord(data.question_text, data.audio_base64);
      } catch (err) {
        if (active) { setError(err.message || "Failed to start interview."); setBusy(false); }
      }
    })();
    return () => {
      active = false;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (speechRecRef.current) { try { speechRecRef.current.stop(); } catch { /* ok */ } }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playAndRecord = (text, audioBase64) => {
    setBusy(true);
    if (audioBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.onended = () => setTimeout(startRecording, 300);
      audio.onerror = () => setTimeout(startRecording, 300);
      audio.play().catch(() => setTimeout(startRecording, 300));
    } else if ("speechSynthesis" in window && text) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.onend = () => setTimeout(startRecording, 300);
      utt.onerror = () => setTimeout(startRecording, 300);
      window.speechSynthesis.speak(utt);
    } else {
      setTimeout(startRecording, 800);
    }
  };

  const captureFrames = async () => {
    if (!videoRef.current || !canvasRef.current) return [];
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.videoWidth === 0) return [];
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const frames = [];
    for (let i = 0; i < 3; i++) {
      ctx.drawImage(video, 0, 0);
      frames.push(canvas.toDataURL("image/jpeg", 0.72));
      await new Promise((r) => setTimeout(r, 90));
    }
    return frames;
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    // Reset busy — we may be called right after TTS when busy is still true
    setBusy(false);
    busyRef.current = false;
    speechTranscriptRef.current = { final: "", interim: "" };
    setLiveTranscript("");
    setInterimTranscript("");

    if (speechRecRef.current) {
      try { speechRecRef.current.start(); } catch { /* already running */ }
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(audioStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        audioStream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        await submitAnswer(blob);
      };
      recorder.start();

      // Store recorder for stopRecording to call
      window.__interviewRecorder = recorder;
      setIsRecording(true);
      setBusy(false);
      setStatus("Recording... speak your answer, then pause for 2 seconds.");
    } catch (err) {
      console.error("[Interview] Mic access failed:", err);
      setStatus("Microphone access failed. Please allow mic and try again.");
    }
  };

  const stopRecording = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (speechRecRef.current) { try { speechRecRef.current.stop(); } catch { /* ok */ } }
    setIsRecording(false);
    setBusy(true);
    setStatus("Processing your answer...");
    if (window.__interviewRecorder && window.__interviewRecorder.state !== "inactive") {
      window.__interviewRecorder.stop();
    }
  };

  const submitAnswer = async (audioBlob) => {
    const browserTranscript = speechTranscriptRef.current.final.trim();
    const faceFrames = await captureFrames();

    const form = new FormData();
    form.append("session_id", sessionIdRef.current);
    form.append("answer_text", browserTranscript);
    form.append("face_frames", JSON.stringify(faceFrames));
    if (audioBlob) form.append("audio", audioBlob, "answer.webm");

    console.log("[Interview] Submitting answer:", { session_id: sessionIdRef.current, transcript: browserTranscript });

    try {
      const data = await apiPostForm("/interview/answer", form);
      console.log("[Interview] Response:", data);

      setLiveTranscript(data.transcript || browserTranscript);

      // Capture the updated history synchronously so onComplete gets it
      const updatedHistory = [...history, { type: "answer", text: data.transcript || browserTranscript }];
      setHistory(updatedHistory);

      // Compute updated metrics directly from response to avoid stale state
      const updatedMetrics = data.analysis
        ? {
            confidence: Number(data.analysis.confidence_score ?? 50),
            engagement: Number(data.analysis.engagement_score ?? 50),
            fluency: Number(data.analysis.fluency_score ?? 50),
          }
        : metrics;
      if (data.analysis) {
        setMetrics(updatedMetrics);
      }

      // Update live face metrics from response
      const updatedFaceMetrics = data.face_metrics
        ? {
            eyeContact: Number(data.face_metrics.eye_contact_score ?? 50),
            gazeStability: Number(data.face_metrics.gaze_stability_score ?? 50),
            engagement: Number(data.face_metrics.engagement_score ?? 50),
            faceConfidence: Number(data.face_metrics.confidence_score ?? 50),
            framesDetected: Number(data.face_metrics.frames_processed ?? 0),
            provider: data.face_metrics.provider || "",
          }
        : faceMetrics;
      if (data.face_metrics) {
        setFaceMetrics(updatedFaceMetrics);
      }

      if (data.completed) {
        onComplete({
          sessionId: sessionIdRef.current,
          config,
          history: updatedHistory,
          evaluation: data.evaluation,
          metrics: updatedMetrics,
          faceMetrics: updatedFaceMetrics,
        });
        return;
      }

      setCurrentQuestion(data.next_question_text);
      setHistory((prev) => [...prev, { type: "question", text: data.next_question_text }]);
      setStatus("AI is responding...");
      playAndRecord(data.next_question_text, data.audio_base64);
    } catch (err) {
      console.error("[Interview] Submit failed:", err);
      setError(err.message || "Failed to process answer.");
      setBusy(false);
    }
  };

  const endInterview = async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    setStatus("Finalizing interview report...");
    try {
      const data = await apiPost("/interview/end", { session_id: sessionId });
      // metrics is current state here since endInterview is called interactively
      onComplete({ sessionId, config, history, evaluation: data.evaluation, metrics, faceMetrics });
    } catch (err) {
      setError(err.message || "Failed to finalize interview.");
      setBusy(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const maxQuestions = config.duration === 5 ? 3 : config.duration === 10 ? 5 : 8;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Mock Interview</h2>
          <p className="text-slate-400 text-sm mt-1">
            {config.role} · {config.experienceLevel} · {config.duration} min
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm font-mono">{fmtTime(elapsedSeconds)}</span>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-2xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800"
          >
            Exit
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: video + metrics */}
        <div className="space-y-4">
          <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute left-4 bottom-4 rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              Keep your face centered.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confidence", value: metrics.confidence, color: "from-violet-500 to-fuchsia-500" },
              { label: "Engagement", value: metrics.engagement, color: "from-cyan-500 to-blue-500" },
              { label: "Fluency", value: metrics.fluency, color: "from-emerald-500 to-teal-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-3xl border border-slate-800 bg-slate-900/75 p-4">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">{label}</p>
                <p className="text-white text-2xl font-bold mb-2">{value}</p>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Face Analysis live panel */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-xs uppercase tracking-widest">Face Analysis</p>
              <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium border ${
                faceMetrics.framesDetected > 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}>
                {faceMetrics.framesDetected > 0 ? `✓ Face Detected (${faceMetrics.framesDetected} frames)` : "⚠ No Face Detected"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Eye Contact", value: faceMetrics.eyeContact, color: "from-cyan-500 to-blue-500" },
                { label: "Gaze Stability", value: faceMetrics.gazeStability, color: "from-violet-500 to-fuchsia-500" },
                { label: "Engagement", value: faceMetrics.engagement, color: "from-emerald-500 to-teal-500" },
                { label: "Face Confidence", value: faceMetrics.faceConfidence, color: "from-amber-500 to-orange-500" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-xs">{label}</span>
                    <span className="text-slate-300 text-xs font-semibold">{Math.round(value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: interview panel */}
        <div className="space-y-4">
          {/* Current question */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Current Question</p>
              <span className="text-xs text-cyan-300 border border-cyan-500/20 bg-cyan-500/8 px-2 py-1 rounded-xl">
                {history.filter((h) => h.type === "question").length}/{maxQuestions}
              </span>
            </div>
            <p className="text-white text-lg leading-relaxed">
              {currentQuestion || "Waiting for the first question..."}
            </p>
          </div>

          {/* Transcript */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-300">Speech Transcript</p>
              <span className="text-xs text-slate-500">
                {isRecording ? "🔴 Listening..." : liveTranscript ? "Captured" : "Idle"}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 min-h-[80px]">
              <p className="text-sm text-slate-200">
                {liveTranscript || "Start recording to see your transcript here."}
                {interimTranscript && <span className="text-slate-400"> {interimTranscript}</span>}
              </p>
            </div>
          </div>

          {/* Conversation history */}
          <div className="rounded-3xl border border-slate-800 bg-[#08111f] p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3">Conversation History</p>
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
              {history.length === 0 && (
                <p className="text-sm text-slate-500">Conversation will appear here.</p>
              )}
              {history.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    entry.type === "question"
                      ? "border-cyan-500/20 bg-cyan-500/8 text-slate-200"
                      : "border-slate-700 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <p className={`text-[0.7rem] uppercase tracking-widest mb-1 ${entry.type === "question" ? "text-cyan-300" : "text-slate-500"}`}>
                    {entry.type === "question" ? "AI Interviewer" : "Your Answer"}
                  </p>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-300">Controls</p>
              <span className="text-xs text-slate-400">{status}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startRecording}
                disabled={busy || isRecording || !sessionId}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
              >
                Start Recording
              </button>
              <button
                type="button"
                onClick={stopRecording}
                disabled={!isRecording}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
              >
                Stop &amp; Send
              </button>
              <button
                type="button"
                onClick={endInterview}
                disabled={busy || !sessionId}
                className="px-4 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-semibold disabled:opacity-40"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
