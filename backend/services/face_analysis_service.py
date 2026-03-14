import base64
import math
import os
from statistics import mean, pstdev


try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    _HAS_MEDIAPIPE_TASKS = True
except Exception:
    mp = None
    mp_python = None
    mp_vision = None
    _HAS_MEDIAPIPE_TASKS = False


# Landmark indices used for gaze/eye analysis (mediapipe face mesh 478-point model)
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362
RIGHT_EYE_OUTER = 263
NOSE_TIP = 1

_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "face_landmarker.task")


def _neutral_response(reason: str) -> dict:
    return {
        "eye_contact_score": 50.0,
        "gaze_stability_score": 50.0,
        "engagement_score": 50.0,
        "confidence_score": 50.0,
        "frames_processed": 0,
        "provider": "fallback",
        "summary": reason,
    }


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def _decode_frame(frame_payload: str):
    if np is None:
        return None
    payload = frame_payload.strip()
    if payload.startswith("data:") and "," in payload:
        payload = payload.split(",", 1)[1]
    try:
        raw = base64.b64decode(payload)
        frame = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None


def analyze_face_frames(frame_payloads: list | None) -> dict:
    if not frame_payloads:
        return _neutral_response("No face frames supplied for analysis.")
    if cv2 is None or np is None:
        return _neutral_response("OpenCV is unavailable in the runtime environment.")
    if not _HAS_MEDIAPIPE_TASKS:
        return _neutral_response("MediaPipe Tasks API is unavailable.")
    if not os.path.exists(_MODEL_PATH):
        return _neutral_response(f"Face landmarker model not found at {_MODEL_PATH}.")

    # Build the FaceLandmarker using the Tasks API (mediapipe 0.10+)
    try:
        base_options = mp_python.BaseOptions(model_asset_path=_MODEL_PATH)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
        )
        landmarker = mp_vision.FaceLandmarker.create_from_options(options)
    except Exception as exc:
        return _neutral_response(f"Failed to load FaceLandmarker: {exc}")

    eye_contact_scores = []
    nose_positions = []
    detections = 0

    try:
        import sys
        print(f"DEBUG: Processing {len(frame_payloads)} frames...", file=sys.stderr)
        for i, payload in enumerate(frame_payloads):
            frame = _decode_frame(payload)
            if frame is None:
                print(f"DEBUG: Frame {i} failed to decode", file=sys.stderr)
                continue
            
            print(f"DEBUG: Frame {i} decoded successfully, shape: {frame.shape}", file=sys.stderr)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = landmarker.detect(mp_image)

            if not result.face_landmarks:
                print(f"DEBUG: Frame {i} NO FACE DETECTED", file=sys.stderr)
                continue
            
            print(f"DEBUG: Frame {i} FACE DETECTED!", file=sys.stderr)

            landmarks = result.face_landmarks[0]
            left_outer = landmarks[LEFT_EYE_OUTER]
            left_inner = landmarks[LEFT_EYE_INNER]
            right_inner = landmarks[RIGHT_EYE_INNER]
            right_outer = landmarks[RIGHT_EYE_OUTER]
            nose = landmarks[NOSE_TIP]

            eye_mid_x = mean([left_outer.x, left_inner.x, right_inner.x, right_outer.x])
            eye_mid_y = mean([left_outer.y, left_inner.y, right_inner.y, right_outer.y])
            interocular = math.dist(
                (left_outer.x, left_outer.y),
                (right_outer.x, right_outer.y),
            ) or 1e-6

            horizontal_offset = abs(nose.x - eye_mid_x) / interocular
            vertical_offset = abs(nose.y - eye_mid_y) / interocular
            roll_offset = abs(left_outer.y - right_outer.y) / interocular
            contact = 1.0 - min(1.0, horizontal_offset * 0.9 + vertical_offset * 0.3 + roll_offset * 0.6)

            eye_contact_scores.append(contact)
            nose_positions.append((nose.x, nose.y))
            detections += 1
    finally:
        landmarker.close()

    if detections == 0:
        return _neutral_response("No face detected in the supplied frames.")

    x_positions = [pos[0] for pos in nose_positions]
    y_positions = [pos[1] for pos in nose_positions]
    stability_penalty = (pstdev(x_positions) + pstdev(y_positions)) * 180 if len(nose_positions) > 1 else 0.2
    gaze_stability = 1.0 - min(1.0, stability_penalty)
    detection_ratio = detections / max(len(frame_payloads), 1)
    eye_contact = mean(eye_contact_scores)
    engagement = min(1.0, eye_contact * 0.6 + detection_ratio * 0.4)
    confidence = min(1.0, eye_contact * 0.45 + gaze_stability * 0.35 + engagement * 0.20)

    return {
        "eye_contact_score": _clamp_score(eye_contact * 100),
        "gaze_stability_score": _clamp_score(gaze_stability * 100),
        "engagement_score": _clamp_score(engagement * 100),
        "confidence_score": _clamp_score(confidence * 100),
        "frames_processed": detections,
        "provider": "mediapipe-tasks-0.10",
        "summary": "Face metrics derived from pose stability, face presence, and eye-line alignment.",
    }
