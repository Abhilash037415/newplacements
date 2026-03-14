import json
import traceback

from flask import Blueprint, jsonify, request

from services.interview_service import finalize_interview, process_interview_response, start_interview
from services.speech_service import synthesize_speech, transcribe_audio


interview_bp = Blueprint("interview", __name__)
speech_bp = Blueprint("speech", __name__)


def _cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@interview_bp.after_request
def add_cors_headers(response):
    return _cors(response)


@speech_bp.after_request
def add_speech_cors_headers(response):
    return _cors(response)


def _get_payload() -> dict:
    payload = request.get_json(silent=True) or {}
    if request.form:
        payload = {**payload, **request.form.to_dict()}
    return payload


def _parse_face_frames(payload: dict) -> list:
    frames = payload.get("face_frames") or payload.get("video_frames") or []
    if isinstance(frames, str):
        try:
            parsed = json.loads(frames)
            if isinstance(parsed, list):
                frames = parsed
        except json.JSONDecodeError:
            frames = []
    if isinstance(frames, list):
        return [f for f in frames if isinstance(f, str) and f.strip()]
    return []


def _resolve_audio(payload: dict):
    if "audio" in request.files:
        return request.files["audio"].read()
    return payload.get("audio_base64") or payload.get("audio")


# ---------------------------------------------------------------------------
# POST /interview/start
# Body: { role, experience_level, duration }
# Returns: { session_id, question_text, audio_base64 }
# ---------------------------------------------------------------------------
@interview_bp.route("/start", methods=["POST", "OPTIONS"])
def start_interview_route():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = _get_payload()
    role = str(payload.get("role", "")).strip()
    experience_level = str(payload.get("experience_level", "")).strip() or "mid"
    duration = payload.get("duration", 10)
    try:
        duration = int(duration)
    except (TypeError, ValueError):
        return jsonify({"error": "duration must be an integer number of minutes."}), 400
    if not role:
        return jsonify({"error": "role is required."}), 400
    if duration <= 0:
        return jsonify({"error": "duration must be greater than zero."}), 400
    try:
        result = start_interview(role=role, experience_level=experience_level, duration=duration)
    except Exception as exc:
        print(f"Interview start failed: {exc}\n{traceback.format_exc()}")
        return jsonify({"error": f"Interview start failed: {exc}"}), 500

    session = result["session"]
    return jsonify({
        "session_id": session["session_id"],
        "role": session["role"],
        "experience_level": session["experience_level"],
        "duration": session["duration"],
        "max_questions": session["max_questions"],
        "question_text": result["question"]["text"],
        "audio_base64": result["speech"].get("audio_base64"),
        "provider": result.get("provider"),
    }), 200


# ---------------------------------------------------------------------------
# POST /interview/answer
# Body (multipart or JSON): { session_id, answer_text, face_frames[], audio? }
# Returns: { completed, transcript, next_question_text?, audio_base64?, evaluation? }
# ---------------------------------------------------------------------------
@interview_bp.route("/answer", methods=["POST", "OPTIONS"])
@interview_bp.route("/respond", methods=["POST", "OPTIONS"])
def answer_interview_route():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = _get_payload()
    session_id = str(payload.get("session_id", "")).strip()
    if not session_id:
        return jsonify({"error": "session_id is required."}), 400

    answer_text = str(payload.get("answer_text", "")).strip() or None
    audio_payload = _resolve_audio(payload)
    audio_encoding = payload.get("audio_encoding")
    face_frames = _parse_face_frames(payload)

    try:
        result = process_interview_response(
            session_id=session_id,
            answer_text=answer_text,
            audio_payload=audio_payload,
            audio_encoding=audio_encoding,
            face_frames=face_frames,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"Interview answer processing failed: {exc}\n{traceback.format_exc()}")
        return jsonify({"error": f"Unexpected interview processing failure: {exc}"}), 500

    response_data = {
        "completed": result.get("completed", False),
        "transcript": result["transcript"]["text"],
        "voice_metrics": result["voice_metrics"],
        "face_metrics": result["face_metrics"],
        "analysis": result["analysis"],
    }

    if result.get("completed"):
        response_data["evaluation"] = result["evaluation"]
    else:
        response_data["next_question_text"] = result["next_question"]["text"]
        response_data["audio_base64"] = result["speech"].get("audio_base64")

    return jsonify(response_data), 200


# ---------------------------------------------------------------------------
# POST /interview/end
# Body: { session_id }
# Returns: { evaluation, completed }
# ---------------------------------------------------------------------------
@interview_bp.route("/end", methods=["POST", "OPTIONS"])
@interview_bp.route("/finalize", methods=["POST", "OPTIONS"])
def end_interview_route():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = _get_payload()
    session_id = str(payload.get("session_id", "")).strip()
    if not session_id:
        return jsonify({"error": "session_id is required."}), 400
    try:
        result = finalize_interview(session_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"Interview finalization failed: {exc}\n{traceback.format_exc()}")
        return jsonify({"error": f"Unexpected finalization failure: {exc}"}), 500
    return jsonify({
        "completed": True,
        "evaluation": result["evaluation"],
    }), 200


# ---------------------------------------------------------------------------
# Speech routes (unchanged)
# ---------------------------------------------------------------------------
@speech_bp.route("/speech-to-text", methods=["POST", "OPTIONS"])
def speech_to_text_route():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = _get_payload()
    audio_payload = _resolve_audio(payload)
    audio_encoding = payload.get("audio_encoding")
    result = transcribe_audio(audio_payload, audio_encoding=audio_encoding)
    return jsonify(result), 200


@speech_bp.route("/text-to-speech", methods=["POST", "OPTIONS"])
def text_to_speech_route():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = _get_payload()
    text = str(payload.get("text", "")).strip()
    voice_name = str(payload.get("voice_name", "")).strip() or "en-US-Neural2-F"
    if not text:
        return jsonify({"error": "text is required"}), 400
    result = synthesize_speech(text, voice_name=voice_name)
    return jsonify(result), 200