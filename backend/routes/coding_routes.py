"""
Coding platform routes: /leetcode/<username> and /codechef/<username>
Fetches stats from LeetCode and CodeChef APIs.
"""
from flask import Blueprint, jsonify
from services.leetcode_service import get_leetcode_stats
from services.codechef_service import get_codechef_stats

coding_bp = Blueprint("coding", __name__)


@coding_bp.route("/leetcode/<username>", methods=["GET"])
def leetcode_stats(username):
    result = get_leetcode_stats(username)
    if not result["valid"]:
        return jsonify({"valid": False, "error": result["error"]}), 400
    return jsonify(result), 200


@coding_bp.route("/codechef/<username>", methods=["GET"])
def codechef_stats(username):
    result = get_codechef_stats(username)
    if not result["valid"]:
        return jsonify({"valid": False, "error": result["error"]}), 400
    return jsonify(result), 200


@coding_bp.route("/dsa-analysis/<username>", methods=["GET"])
def dsa_analysis(username):
    result = get_leetcode_stats(username)
    if not result["valid"]:
        return jsonify({"valid": False, "error": result["error"]}), 400
    return jsonify({
        "valid": True,
        "username": username,
        "topic_stats": result.get("topic_stats", []),
        "dsa_analysis": result.get("dsa_analysis", {}),
        "easy": result.get("easy", 0),
        "medium": result.get("medium", 0),
        "hard": result.get("hard", 0),
        "total_solved": result.get("total_solved", 0),
    }), 200
