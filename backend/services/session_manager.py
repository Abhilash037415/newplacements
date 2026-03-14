import math
import uuid
from datetime import datetime, timezone


sessions = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_max_questions(duration_minutes: int) -> int:
    mapping = {
        5: 3,
        10: 5,
        15: 8,
    }
    if duration_minutes in mapping:
        return mapping[duration_minutes]
    if duration_minutes <= 5:
        return 3
    if duration_minutes <= 10:
        return 5
    if duration_minutes <= 15:
        return 8
    return max(3, math.ceil(duration_minutes / 2))


def create_session(role: str, experience_level: str, duration: int) -> dict:
    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "role": role,
        "experience_level": experience_level,
        "duration": int(duration),
        "max_questions": _resolve_max_questions(int(duration)),
        "questions": [],
        "answers": [],
        "voice_metrics": [],
        "face_metrics": [],
        "analysis": [],
        "final_evaluation": None,
        "started_at": _now_iso(),
        "updated_at": _now_iso(),
        "completed": False,
    }
    sessions[session_id] = session
    return session


def get_session(session_id: str) -> dict | None:
    return sessions.get(session_id)


def touch_session(session: dict) -> None:
    session["updated_at"] = _now_iso()


def add_question(session: dict, question_text: str, question_type: str = "question") -> dict:
    question = {
        "index": len(session["questions"]) + 1,
        "type": question_type,
        "text": question_text,
        "asked_at": _now_iso(),
    }
    session["questions"].append(question)
    touch_session(session)
    return question


def add_answer(session: dict, transcript: str, source: str = "text") -> dict:
    answer = {
        "index": len(session["answers"]) + 1,
        "text": transcript,
        "source": source,
        "answered_at": _now_iso(),
    }
    session["answers"].append(answer)
    touch_session(session)
    return answer


def add_voice_metrics(session: dict, metrics: dict) -> None:
    session["voice_metrics"].append(metrics)
    touch_session(session)


def add_face_metrics(session: dict, metrics: dict) -> None:
    session["face_metrics"].append(metrics)
    touch_session(session)


def add_analysis(session: dict, analysis: dict) -> None:
    session["analysis"].append(analysis)
    touch_session(session)


def complete_session(session: dict, evaluation: dict) -> None:
    session["completed"] = True
    session["final_evaluation"] = evaluation
    touch_session(session)
