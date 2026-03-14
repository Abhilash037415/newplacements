import base64
import binascii
import os


try:
    from google.cloud import speech
    from google.cloud import texttospeech
except Exception:
    speech = None
    texttospeech = None


ENCODING_MAP = {
    "linear16": "LINEAR16",
    "flac": "FLAC",
    "mulaw": "MULAW",
    "amr": "AMR",
    "amr_wb": "AMR_WB",
    "ogg_opus": "OGG_OPUS",
    "speex": "SPEEX_WITH_HEADER_BYTE",
    "webm_opus": "WEBM_OPUS",
    "mp3": "MP3",
}


def _get_credentials():
    from google.oauth2 import service_account
    import json

    private_key = os.getenv("GCP_PRIVATE_KEY", "")
    if private_key:
        # Handle literal \n in env strings if any
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


def _decode_audio_payload(audio_payload: str | bytes | None) -> bytes:
    if audio_payload is None:
        return b""
    if isinstance(audio_payload, bytes):
        return audio_payload
    payload = audio_payload.strip()
    if "," in payload and payload.startswith("data:"):
        payload = payload.split(",", 1)[1]
    try:
        return base64.b64decode(payload)
    except (ValueError, binascii.Error):
        return b""


def _resolve_encoding(audio_encoding: str | None):
    if speech is None:
        return None
    encoding_name = ENCODING_MAP.get((audio_encoding or "webm_opus").lower())
    if not encoding_name:
        return None
    return getattr(speech.RecognitionConfig.AudioEncoding, encoding_name, None)


def transcribe_audio(audio_payload: str | bytes | None, audio_encoding: str | None = None, language_code: str = "en-US") -> dict:
    audio_bytes = _decode_audio_payload(audio_payload)
    if not audio_bytes:
        return {
            "transcript": "",
            "provider": "none",
            "used_fallback": True,
            "warning": "No audio payload supplied for transcription.",
        }

    credentials = _get_credentials()
    if speech is None or not credentials:
        return {
            "transcript": "",
            "provider": "fallback",
            "used_fallback": True,
            "warning": "Google Cloud Speech is unavailable; provide answer_text as a fallback.",
        }

    try:
        client = speech.SpeechClient(credentials=credentials)
        encoding = _resolve_encoding(audio_encoding)
        config_kwargs = {
            "language_code": language_code,
            "enable_automatic_punctuation": True,
            "model": "latest_long",
        }
        if encoding is not None:
            config_kwargs["encoding"] = encoding
        config = speech.RecognitionConfig(**config_kwargs)
        audio = speech.RecognitionAudio(content=audio_bytes)
        response = client.recognize(config=config, audio=audio)
        transcript = " ".join(
            result.alternatives[0].transcript
            for result in response.results
            if result.alternatives
        ).strip()
        return {
            "transcript": transcript,
            "provider": "google-cloud-speech",
            "used_fallback": False,
        }
    except Exception as exc:
        return {
            "transcript": "",
            "provider": "fallback",
            "used_fallback": True,
            "warning": f"Speech transcription failed: {exc}",
        }


def synthesize_speech(text: str, voice_name: str = "en-US-Neural2-F") -> dict:
    if not text.strip():
        return {"audio_base64": None, "provider": "none", "used_fallback": True}

    credentials = _get_credentials()
    if texttospeech is None or not credentials:
        return {
            "audio_base64": None,
            "provider": "fallback",
            "used_fallback": True,
            "warning": "Google Cloud Text-to-Speech is unavailable.",
        }

    try:
        client = texttospeech.TextToSpeechClient(credentials=credentials)
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
        )
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return {
            "audio_base64": base64.b64encode(response.audio_content).decode("utf-8"),
            "provider": "google-cloud-tts",
            "used_fallback": False,
        }
    except Exception as exc:
        return {
            "audio_base64": None,
            "provider": "fallback",
            "used_fallback": True,
            "warning": f"Text-to-speech failed: {exc}",
        }
