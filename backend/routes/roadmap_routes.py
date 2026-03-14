"""
Learning roadmap routes: /roadmap/<user_id>
Generates a personalized week-by-week study plan based on the student's profile.
"""
from flask import Blueprint, jsonify
from db import profiles_collection
from services.roadmap_service import generate_learning_roadmap

roadmap_bp = Blueprint("roadmap", __name__)


@roadmap_bp.route("/roadmap/<user_id>", methods=["GET"])
def get_roadmap(user_id):
    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        profile = profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not profile:
        return jsonify({"error": "Profile not found. Please create your profile first."}), 404

    roadmap = generate_learning_roadmap(profile)
    if not roadmap:
        return jsonify({"error": "Could not generate roadmap. Please try again."}), 500

    return jsonify({"roadmap": roadmap}), 200
