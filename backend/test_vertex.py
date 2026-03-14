import os
import sys
import traceback
from dotenv import load_dotenv

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)
load_dotenv()

from services.gemini_service import genai

try:
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"Testing Gemini API Key: {api_key[:10]}...")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash", contents="Say hello."
    )
    print(f"Response: {response.text}")
except Exception as e:
    with open("traceback.log", "w", encoding="utf-8") as f:
        f.write(traceback.format_exc())
    print("Failed. Traceback written to traceback.log")
