import base64
import os
import statistics
import tempfile


try:
    import librosa
    import numpy as np
except Exception:
    librosa = None
    np = None

try:
    import parselmouth
except Exception:
    parselmouth = None


def _neutral_metrics(reason: str, transcript: str = "") -> dict:
    return {
        "speech_rate_wpm": 0.0,
        "pitch_variation": 0.0,
        "pause_frequency": 0.0,
        "energy_level": 50.0,
        "fluency_score": 50.0,
        "confidence_score": 50.0,
        "provider": "fallback",
        "summary": reason,
        "transcript_length": len(transcript.split()),
    }


def _decode_audio(audio_payload: str | bytes | None) -> bytes:
    if audio_payload is None:
        return b""
    if isinstance(audio_payload, bytes):
        return audio_payload
    payload = audio_payload.strip()
    if payload.startswith("data:") and "," in payload:
        payload = payload.split(",", 1)[1]
    try:
        return base64.b64decode(payload)
    except Exception:
        return b""


def _clamp(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def analyze_voice(audio_payload: str | bytes | None, transcript: str) -> dict:
    audio_bytes = _decode_audio(audio_payload)
    if not audio_bytes:
        return _neutral_metrics("No audio supplied for voice analysis.", transcript)
    if librosa is None or np is None or parselmouth is None:
        return _neutral_metrics("Voice-analysis libraries are unavailable in the runtime environment.", transcript)

    suffix = ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            signal, sample_rate = librosa.load(temp_path, sr=16000, mono=True)
        except Exception as read_exc:
            return _neutral_metrics(f"Librosa failed to decode the audio format ({temp_path}): {read_exc}", transcript)
        
        if signal.size == 0:
            return _neutral_metrics("Decoded audio stream is empty.", transcript)

        duration_seconds = max(len(signal) / max(sample_rate, 1), 1e-3)
        word_count = len([word for word in transcript.split() if word.strip()])
        speech_rate_wpm = (word_count / duration_seconds) * 60 if word_count else 0.0

        intervals = librosa.effects.split(signal, top_db=28)
        pause_count = 0
        if len(intervals) > 1:
            for current, nxt in zip(intervals, intervals[1:]):
                gap_seconds = max(0, (nxt[0] - current[1]) / sample_rate)
                if gap_seconds >= 0.25:
                    pause_count += 1
        pause_frequency = pause_count / max(duration_seconds / 60, 1e-3)

        rms = librosa.feature.rms(y=signal)[0]
        energy_level = float(np.clip(np.mean(rms) * 2500, 0, 100))

        sound = parselmouth.Sound(temp_path)
        pitch = sound.to_pitch()
        pitch_values = [value for value in pitch.selected_array["frequency"] if value > 0]
        pitch_variation = statistics.pstdev(pitch_values) if len(pitch_values) > 1 else 0.0

        fillers = sum(transcript.lower().split().count(token) for token in ("um", "uh", "like", "actually"))
        filler_penalty = min(20.0, fillers * 4.0)
        rate_penalty = min(25.0, abs(speech_rate_wpm - 140.0) * 0.25) if speech_rate_wpm else 20.0
        pause_penalty = min(25.0, pause_frequency * 2.5)
        fluency_score = _clamp(100.0 - rate_penalty - pause_penalty - filler_penalty)

        pitch_bonus = max(0.0, 20.0 - abs(pitch_variation - 35.0) * 0.5)
        confidence_score = _clamp(45.0 + min(30.0, energy_level * 0.25) + pitch_bonus - min(15.0, pause_frequency * 1.5))

        return {
            "speech_rate_wpm": round(speech_rate_wpm, 2),
            "pitch_variation": round(pitch_variation, 2),
            "pause_frequency": round(pause_frequency, 2),
            "energy_level": _clamp(energy_level),
            "fluency_score": fluency_score,
            "confidence_score": confidence_score,
            "provider": "librosa-parselmouth",
            "summary": "Voice metrics derived from rate, pause cadence, pitch spread, and RMS energy.",
            "transcript_length": word_count,
        }
    except Exception as exc:
        return _neutral_metrics(f"Voice analysis failed: {exc}", transcript)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
