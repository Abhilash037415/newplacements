import os
import sys

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.interview_service import _resolve_credentials_path
from services.speech_service import synthesize_speech, transcribe_audio

path = _resolve_credentials_path()
print(f"Resolved Credentials Path: {path}")

# Does synthesize_speech work now that the env var is theoretically set?
result = synthesize_speech("Hello, testing the credentials.")

if result.get("audio_base64"):
    print("SUCCESS: Synthesized speech payload length:", len(result["audio_base64"]))
else:
    print("FAILED:", result)
