import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from services.interview_service import _model_client

print(f"Testing gemini-1.5-pro...")
text = _model_client.generate("Say hello", "gemini-1.5-pro")
print(f"Result: {text}")

print(f"Testing gemini-1.5-flash...")
text2 = _model_client.generate("Say hello", "gemini-1.5-flash")
print(f"Result: {text2}")
