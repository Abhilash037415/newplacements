from pymongo import MongoClient
import certifi
from config import Config
import mongomock

try:
    mongo_client = MongoClient(
        Config.MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    # Force a connection test on startup
    mongo_client.admin.command("ping")
    print("MongoDB connected successfully via Atlas")
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    print("Falling back to IN-MEMORY mongomock database for testing.")
    print("WARNING: Data will be lost when the server restarts.")
    mongo_client = mongomock.MongoClient()

db = mongo_client["placement_readiness"] if mongo_client else None

# Collections
users_collection = db["users"] if db is not None else None
profiles_collection = db["profiles"] if db is not None else None
announcements_collection = db["announcements"] if db is not None else None

