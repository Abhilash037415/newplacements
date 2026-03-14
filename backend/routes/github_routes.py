"""
GitHub verification route: /github/verify/<username>
"""
from flask import Blueprint, jsonify
from services.github_service import verify_github_username

github_bp = Blueprint("github", __name__)


@github_bp.route("/github/verify/<username>", methods=["GET"])
def verify_github(username):
    result = verify_github_username(username)
    if not result["valid"]:
        return jsonify({"valid": False, "error": result["error"]}), 400

    user_data = result["user_data"]
    return jsonify({
        "valid": True,
        "username": user_data.get("login"),
        "public_repos": user_data.get("public_repos", 0),
        "avatar_url": user_data.get("avatar_url", ""),
    }), 200
