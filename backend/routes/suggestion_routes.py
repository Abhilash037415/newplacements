"""
Suggestion routes: /suggestions/<user_id>
Analyses the student profile with Gemini and returns actionable insights.
"""
from flask import Blueprint, jsonify
from db import profiles_collection
from services.gemini_service import generate_profile_suggestions

suggestion_bp = Blueprint("suggestions", __name__)


@suggestion_bp.route("/suggestions/<user_id>", methods=["GET"])
def get_suggestions(user_id):
    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        profile = profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not profile:
        return jsonify({"error": "Profile not found. Please create your profile first."}), 404

    suggestions = generate_profile_suggestions(profile)
    if not suggestions:
        return jsonify({"error": "Could not generate suggestions. Please try again."}), 500
    return jsonify({"suggestions": suggestions}), 200
