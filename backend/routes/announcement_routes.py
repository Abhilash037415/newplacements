from flask import Blueprint, request, jsonify
from datetime import datetime
from db import announcements_collection

announcement_bp = Blueprint("announcements", __name__)

@announcement_bp.route("/announcements", methods=["GET"])
def get_announcements():
    """Fetch all announcements, sorted by date descending."""
    if announcements_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        announcements_cursor = announcements_collection.find({}, {"_id": 0}).sort("date", -1)
        announcements = list(announcements_cursor)
        return jsonify({"announcements": announcements}), 200
    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500

@announcement_bp.route("/admin/announcements", methods=["POST"])
def create_announcement():
    """Create a new announcement (admin only route, but currently just creates it)."""
    if announcements_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    title = data.get("title")
    message = data.get("message")

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    new_announcement = {
        "title": title,
        "message": message,
        "date": datetime.utcnow().isoformat()
    }

    try:
        announcements_collection.insert_one(new_announcement)
        # return the created announcement (without _id)
        if "_id" in new_announcement:
            del new_announcement["_id"]
        return jsonify({"message": "Announcement created successfully", "announcement": new_announcement}), 201
    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500
