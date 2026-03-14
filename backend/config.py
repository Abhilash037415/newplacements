import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/placement_readiness")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")
    OFFICER_EMAIL = os.getenv("OFFICER_EMAIL", "admin@placement.com")
    OFFICER_PASSWORD = os.getenv("OFFICER_PASSWORD", "admin123")
