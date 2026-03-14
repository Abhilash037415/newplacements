import glob
import json
import os
from datetime import datetime, timezone

from services import gemini_service
from services.face_analysis_service import analyze_face_frames
from services.session_manager import (
    add_analysis,
    add_answer,
    add_face_metrics,
    add_question,
    add_voice_metrics,
    complete_session,
    create_session,
    get_session,
)
from services.speech_service import synthesize_speech, transcribe_audio
from services.voice_analysis_service import analyze_voice


try:
    import vertexai
    from google.oauth2 import service_account
    from vertexai.generative_models import GenerativeModel as VertexGenerativeModel
except Exception:
    vertexai = None
    service_account = None
    VertexGenerativeModel = None


QUESTION_STYLE = (
    "You are a professional interviewer conducting a mock interview. "
    "Ask one question at a time. Ask follow-up questions based on answers. "
    "Gradually increase difficulty. Blend HR and technical interviewing tone."
)


def _backend_dir() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _get_credentials():
    if service_account is None:
        return None
    
    private_key = os.getenv("GCP_PRIVATE_KEY", "")
    if private_key:
        private_key = private_key.replace("\\n", "\n")

    info = {
        "type": os.getenv("GCP_TYPE"),
        "project_id": os.getenv("GCP_PROJECT_ID"),
        "private_key_id": os.getenv("GCP_PRIVATE_KEY_ID"),
        "private_key": private_key,
        "client_email": os.getenv("GCP_CLIENT_EMAIL"),
        "client_id": os.getenv("GCP_CLIENT_ID"),
        "auth_uri": os.getenv("GCP_AUTH_URI"),
        "token_uri": os.getenv("GCP_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("GCP_AUTH_PROVIDER_X509_CERT_URL"),
        "client_x509_cert_url": os.getenv("GCP_CLIENT_X509_CERT_URL"),
        "universe_domain": os.getenv("GCP_UNIVERSE_DOMAIN")
    }
    
    # If missing required fields, return None
    if not info["project_id"] or not info["private_key"] or not info["client_email"]:
        return None
        
    try:
        return service_account.Credentials.from_service_account_info(info)
    except Exception:
        return None


class _ModelClient:
    def __init__(self):
        self._provider = "unavailable"

    @property
    def provider(self) -> str:
        return self._provider

    def generate(self, prompt: str, model_name: str) -> str:
        # 1. Try Application Default Credentials (ADC) / Service Account mapping natively using Vertex AI
        try:
            from google.genai import Client
            credentials = _get_credentials()
            if credentials:
                try: 
                    # If we have explicit credentials from env, use them
                    import google.auth.transport.requests
                    # Ensure credentials are valid and refreshed if needed
                    auth_req = google.auth.transport.requests.Request()
                    credentials.refresh(auth_req)
                except Exception as e:
                    pass
                # The newest google-genai library accepts Vertex AI but configuring project and credentials is required natively via OS env variables
                # Since we inject them into OS environment from pure .env anyway... wait, we didn't inject them into OS environment, we just created a Credentials object. 
                # Actually, the older Vertex AI SDK (legacy) or new `google.genai` SDK for Vertex needs ADC. 
                # Let's fallback to injecting ADC natively if credentials object is present:
                import json, tempfile
                with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
                    # Not secure to write to disk, so instead we inject into the legacy vertexai library
                    import vertexai
                    vertexai.init(project=credentials.project_id, credentials=credentials, location="us-central1")
                
            client = gemini_service.genai.Client(vertexai=True, location="us-central1")
            response = client.models.generate_content(
                model=model_name, contents=prompt
            )
            text = getattr(response, "text", "") or ""
            if text.strip():
                self._provider = "google-genai-adc"
                return text.strip()
        except Exception as e:
            import traceback
            with open("traceback.log", "w", encoding="utf-8") as f:
                f.write(traceback.format_exc())
            print(f"[ModelClient] ADC Client failed for {model_name}: {e}")

        # 2. Try explicit GEMINI_API_KEY fallback from config
        api_key = getattr(gemini_service.Config, "GEMINI_API_KEY", "")
        if api_key:
            try:
                client = gemini_service.genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model=model_name, contents=prompt
                )
                text = getattr(response, "text", "") or ""
                if text.strip():
                    self._provider = "google-genai-apikey"
                    return text.strip()
            except Exception as e:
                print(f"[ModelClient] API Key Client failed for {model_name}: {e}")
        else:
            print("[ModelClient] No GEMINI_API_KEY configured for fallback.")

        print(f"[ModelClient] All providers failed for {model_name}. Returning empty.")
        self._provider = "fallback"
        return ""


_model_client = _ModelClient()


def _json_or_empty(text: str):
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        cleaned = cleaned.rsplit("```", 1)[0].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                return None
    return None


def _questions_asked(session: dict) -> int:
    return len(session["questions"])


def _answers_recorded(session: dict) -> int:
    return len(session["answers"])


def _duration_elapsed(session: dict) -> bool:
    started_at = datetime.fromisoformat(session["started_at"])
    elapsed_minutes = (datetime.now(timezone.utc) - started_at).total_seconds() / 60
    return elapsed_minutes >= session["duration"]


def _should_finish(session: dict) -> bool:
    return session.get("completed") or _answers_recorded(session) >= session["max_questions"] or _duration_elapsed(session)


def _history_text(session: dict) -> str:
    pairs = []
    for index, question in enumerate(session["questions"]):
        pairs.append(f"Q{index + 1}: {question['text']}")
        if index < len(session["answers"]):
            pairs.append(f"A{index + 1}: {session['answers'][index]['text']}")
    return "\n".join(pairs)


def _fallback_question(session: dict) -> str:
    role = session["role"]
    level = session["experience_level"]
    question_bank = [
        f"Tell me about yourself and why you are interested in the {role} role at the {level} level.",
        f"Describe a challenging project you handled that best demonstrates your readiness for a {role} position.",
        f"What tradeoffs do you usually consider when designing a solution as a {role} candidate?",
        f"Walk me through a technical problem you solved recently and explain how you validated the result.",
        f"Describe a time you received difficult feedback and how you responded.",
        f"If production failed five minutes before a release, how would you handle the incident and communicate status?",
        f"What would you improve first in an underperforming system owned by your team, and why?",
    ]
    index = min(_questions_asked(session), len(question_bank) - 1)
    return question_bank[index]


def _generate_question(session: dict, previous_answer: str | None = None) -> str:
    question_number = _questions_asked(session) + 1
    prompt = (
        f"{QUESTION_STYLE}\n\n"
        f"Target role: {session['role']}\n"
        f"Experience level: {session['experience_level']}\n"
        f"Interview duration: {session['duration']} minutes\n"
        f"Question number: {question_number} of {session['max_questions']}\n\n"
        f"Conversation so far:\n{_history_text(session) or 'No prior conversation.'}\n\n"
    )
    if previous_answer:
        prompt += (
            f"The candidate just provided this answer:\n\"{previous_answer}\"\n\n"
            "CRITICAL INSTRUCTION: You MUST start your response by evaluating their answer directly to them in 1-2 conversational sentences. "
            "Tell them what was good and give one specific suggestion for improvement based on the text they provided.\n"
            "ONLY AFTER providing this audible feedback, seamlessly transition into asking the next question or follow-up question.\n"
            "If you do not evaluate their previous answer first, you have failed.\n\n"
        )
    prompt += "Return your entire response (feedback and question) as a single continuous block of plain text. Do not use bolding, bullet points, or markdown formatting, so it can be converted to speech elegantly."
    text = _model_client.generate(prompt, "gemini-2.5-flash")
    return text.strip() if text.strip() else _fallback_question(session)


def _fallback_evaluation(session: dict) -> dict:
    voice_scores = [item.get("fluency_score", 50.0) for item in session["voice_metrics"]]
    face_scores = [item.get("confidence_score", 50.0) for item in session["face_metrics"]]
    technical_score = round(min(100.0, 45.0 + len(session["answers"]) * 8.0), 2)
    communication_score = round(sum(voice_scores) / len(voice_scores), 2) if voice_scores else 50.0
    confidence_score = round(
        (sum(face_scores) / len(face_scores) + sum(item.get("confidence_score", 50.0) for item in session["voice_metrics"]) / max(len(session["voice_metrics"]), 1)) / 2,
        2,
    ) if session["voice_metrics"] or session["face_metrics"] else 50.0
    return {
        "technical_score": technical_score,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "strengths": [
            "Maintained a full interview session with structured answers.",
            "Provided enough content for follow-up questioning.",
        ],
        "weaknesses": [
            "Fallback evaluation was used because a Gemini evaluation model was unavailable.",
        ],
        "improvement_suggestions": [
            "Provide more concrete examples with measurable impact.",
            "Keep answers concise while highlighting technical decision-making.",
            "Practice speaking with fewer pauses and stronger eye contact.",
        ],
        "overall_rating": "Promising",
        "provider": "fallback",
    }


def _generate_final_evaluation(session: dict) -> dict:
    payload = {
        "role": session["role"],
        "experience_level": session["experience_level"],
        "duration": session["duration"],
        "conversation": {
            "questions": session["questions"],
            "answers": session["answers"],
        },
        "voice_metrics": session["voice_metrics"],
        "face_metrics": session["face_metrics"],
        "analysis": session["analysis"],
    }
    prompt = (
        "You are an expert technical interviewer. Evaluate the candidate's performance in this mock interview.\n\n"
        "Scoring criteria (ALL scores MUST be integers from 0 to 100):\n"
        "- technical_score (0-100): depth, accuracy, and relevance of technical answers.\n"
        "- communication_score (0-100): clarity, fluency, structure of verbal responses.\n"
        "- confidence_score (0-100): based on voice energy, pitch variation, and face engagement metrics.\n\n"
        "IMPORTANT: Scores must be on a scale of 0 to 100, NOT 0 to 10. A score of 50 means average.\n\n"
        "Also evaluate the candidate's face presence and body language using the face_metrics data:\n"
        "- eye_contact_score: how often the candidate looked at the camera\n"
        "- gaze_stability_score: how steady and consistent the head position was\n"
        "- engagement_score: overall face presence and attentiveness\n"
        "- confidence_score (face): body language confidence signals\n"
        "Based on these, provide specific, actionable coaching tips in face_analysis_suggestions.\n\n"
        "Return ONLY a valid JSON object with these exact fields:\n"
        "{\n"
        '  "technical_score": <integer 0-100>,\n'
        '  "communication_score": <integer 0-100>,\n'
        '  "confidence_score": <integer 0-100>,\n'
        '  "strengths": [<list of strength strings>],\n'
        '  "weaknesses": [<list of weakness strings>],\n'
        '  "improvement_suggestions": [<list of suggestion strings>],\n'
        '  "face_analysis_suggestions": [<2-4 specific coaching tips about eye contact, gaze, head posture, and on-screen presence>],\n'
        '  "overall_rating": <one of: "Excellent", "Good", "Promising", "Needs Improvement", "Poor">\n'
        "}\n\n"
        f"Interview data:\n{json.dumps(payload, ensure_ascii=True)}"
    )
    text = _model_client.generate(prompt, "gemini-2.5-flash")
    parsed = _json_or_empty(text)
    if isinstance(parsed, dict):
        # Defensive scaling: if Gemini returns scores on a 1-10 scale, scale up to 0-100
        for score_key in ("technical_score", "communication_score", "confidence_score"):
            raw = parsed.get(score_key)
            if isinstance(raw, (int, float)) and 0 <= raw <= 10:
                parsed[score_key] = round(float(raw) * 10, 2)
        parsed["provider"] = _model_client.provider
        return parsed
    return _fallback_evaluation(session)



def _combine_metrics(voice_metrics: dict, face_metrics: dict, transcript: str) -> dict:
    combined_confidence = round(
        (voice_metrics.get("confidence_score", 50.0) + face_metrics.get("confidence_score", 50.0)) / 2,
        2,
    )
    combined = {
        "confidence_score": combined_confidence,
        "engagement_score": round(face_metrics.get("engagement_score", 50.0), 2),
        "fluency_score": round(voice_metrics.get("fluency_score", 50.0), 2),
        "transcript_length": len(transcript.split()),
        "summary": (
            f"Confidence {combined_confidence}, engagement {face_metrics.get('engagement_score', 50.0):.2f}, "
            f"fluency {voice_metrics.get('fluency_score', 50.0):.2f}."
        ),
    }
    return combined


def start_interview(role: str, experience_level: str, duration: int) -> dict:
    session = create_session(role=role, experience_level=experience_level, duration=duration)
    question_text = _generate_question(session)
    question = add_question(session, question_text, question_type="question")
    speech = synthesize_speech(question_text)
    return {
        "session": session,
        "question": question,
        "speech": speech,
        "provider": _model_client.provider,
    }


def process_interview_response(
    session_id: str,
    answer_text: str | None = None,
    audio_payload: str | bytes | None = None,
    audio_encoding: str | None = None,
    face_frames: list[str] | None = None,
) -> dict:
    session = get_session(session_id)
    if session is None:
        raise ValueError("Interview session not found.")
    if session.get("completed"):
        raise ValueError("Interview session is already completed.")

    # Avoid transcribing via Google Cloud Speech if frontend provided text
    transcript_result = {}
    if not answer_text or not answer_text.strip():
        transcript_result = transcribe_audio(audio_payload, audio_encoding=audio_encoding)
    transcript = (answer_text or "").strip() or transcript_result.get("transcript", "").strip()
    transcript_fallback_used = False
    if not transcript and audio_payload is not None:
        # Keep the interview flowing even when external STT providers are unavailable.
        transcript = "[Audio response captured. Transcript unavailable in backend STT provider.]"
        transcript_fallback_used = True
    if not transcript:
        raise ValueError("Could not determine an answer transcript. Provide answer_text or valid audio.")

    answer = add_answer(session, transcript, source="audio" if audio_payload else "text")
    voice_metrics = analyze_voice(audio_payload, transcript)
    face_metrics = analyze_face_frames(face_frames)
    combined_metrics = _combine_metrics(voice_metrics, face_metrics, transcript)
    add_voice_metrics(session, voice_metrics)
    add_face_metrics(session, face_metrics)
    add_analysis(session, combined_metrics)

    result = {
        "session": session,
        "answer": answer,
        "transcript": {
            "text": transcript,
            "fallback_text_used": transcript_fallback_used,
            **transcript_result,
        },
        "voice_metrics": voice_metrics,
        "face_metrics": face_metrics,
        "analysis": combined_metrics,
    }

    if _should_finish(session):
        evaluation = _generate_final_evaluation(session)
        complete_session(session, evaluation)
        result["completed"] = True
        result["evaluation"] = evaluation
        return result

    next_question_text = _generate_question(session, previous_answer=transcript)
    question_type = "followup" if _answers_recorded(session) > 0 else "question"
    next_question = add_question(session, next_question_text, question_type=question_type)
    question_speech = synthesize_speech(next_question_text)

    result["completed"] = False
    result["next_question"] = next_question
    result["speech"] = question_speech
    return result


def finalize_interview(session_id: str) -> dict:
    session = get_session(session_id)
    if session is None:
        raise ValueError("Interview session not found.")
    if session.get("final_evaluation"):
        return {
            "session": session,
            "evaluation": session["final_evaluation"],
            "completed": True,
        }

    evaluation = _generate_final_evaluation(session)
    complete_session(session, evaluation)
    return {
        "session": session,
        "evaluation": evaluation,
        "completed": True,
    }
