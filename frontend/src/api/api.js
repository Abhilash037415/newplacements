import axios from "axios";

const API = axios.create({
  baseURL: "http://c607-117-192-9-245.ngrok-free.app//api",
  headers: { "Content-Type": "application/json" },
});

const INTERVIEW_BASE_URL =
  "http://c607-117-192-9-245.ngrok-free.app//interview";
const ROOT_BASE_URL = "http://c607-117-192-9-245.ngrok-free.app/";

export const registerUser = (data) => API.post("/register", data);
export const loginUser = (data) => API.post("/login", data);
export const updateProfile = (data) => API.post("/profile/update", data);
export const getProfile = (userId) => API.get(`/profile/${userId}`);
export const predictScore = (userId) =>
  API.post("/predict", { user_id: userId });
export const getStrengths = (userId) => API.get(`/predict/strengths/${userId}`);
export const getPercentile = (userId) =>
  API.get(`/predict/percentile/${userId}`);
export const whatIfPredict = (features) =>
  API.post("/predict/what-if", features);
export const verifyGithub = (username) => API.get(`/github/verify/${username}`);
export const getSuggestions = (userId) => API.get(`/suggestions/${userId}`);
export const getLeetcodeStats = (username) => API.get(`/leetcode/${username}`);
export const getCodechefStats = (username) => API.get(`/codechef/${username}`);
export const getDsaAnalysis = (username) =>
  API.get(`/dsa-analysis/${username}`);
export const getRoadmap = (userId) => API.get(`/roadmap/${userId}`);
export const adminLogin = (data) => API.post("/admin/login", data);
export const getAdminStudents = () => API.get("/admin/students");
export const getAdminLeaderboard = () => API.get("/admin/leaderboard");
export const getAnnouncements = () => API.get("/announcements");
export const createAnnouncement = (data) =>
  API.post("/admin/announcements", data);

export const uploadResume = (userId, file) => {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("resume", file);
  return axios.post(
    "http://c607-117-192-9-245.ngrok-free.app//api/resume/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
};

const parseSseBlock = (block) => {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const raw = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: raw };
  }
};

export async function streamInterviewAction(action, payload = {}, onEvent) {
  const hasAudioBlob = payload.audioBlob instanceof Blob;
  const requestInit = {
    method: "POST",
    headers: {},
  };

  if (hasAudioBlob) {
    const formData = new FormData();
    formData.append("action", action);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || key === "audioBlob") {
        return;
      }
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
        return;
      }
      formData.append(key, String(value));
    });
    formData.append(
      "audio",
      payload.audioBlob,
      payload.audioFilename || "answer.webm",
    );
    requestInit.body = formData;
  } else {
    requestInit.headers["Content-Type"] = "application/json";
    requestInit.body = JSON.stringify({ action, ...payload });
  }

  const response = await fetch(`${INTERVIEW_BASE_URL}/stream`, requestInit);
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Interview stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const eventBoundary = /\r?\n\r?\n/;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    while (eventBoundary.test(buffer)) {
      const match = buffer.match(eventBoundary);
      if (!match || match.index === undefined) {
        break;
      }
      const block = buffer.slice(0, match.index).trim();
      buffer = buffer.slice(match.index + match[0].length);

      const parsed = parseSseBlock(block);
      if (parsed) {
        onEvent?.(parsed);
      }
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseBlock(buffer.trim());
    if (parsed) {
      onEvent?.(parsed);
    }
  }
}

export async function speechToText(audioBlob, audioEncoding = "webm_opus") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");
  formData.append("audio_encoding", audioEncoding);

  const response = await fetch(`${ROOT_BASE_URL}/speech-to-text`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Speech-to-text failed with ${response.status}`);
  }

  return response.json();
}

export async function textToSpeech(text, voiceName = "en-US-Neural2-F") {
  const response = await fetch(`${ROOT_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_name: voiceName }),
  });

  if (!response.ok) {
    throw new Error(`Text-to-speech failed with ${response.status}`);
  }

  return response.json();
}

export default API;
