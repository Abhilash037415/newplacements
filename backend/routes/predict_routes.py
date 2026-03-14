"""
Prediction routes: /predict
"""
from flask import Blueprint, request, jsonify
from db import profiles_collection
from services.prediction_service import predict_placement_score

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    # Fetch profile from DB
    try:
        profile = profiles_collection.find_one(
            {"user_id": user_id}, {"_id": 0}
        )
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not profile:
        return jsonify({"error": "Profile not found. Please update your profile first."}), 404

    # Ensure GitHub profile has been verified
    if not profile.get("github_verified"):
        return jsonify({"error": "GitHub profile not verified. Please update your profile with a valid GitHub username first."}), 400

    # Prepare raw features for prediction (engineering happens inside service)
    features = {
        "cgpa": profile.get("cgpa", 0),
        "internships": profile.get("internships", 0),
        "projects_count": profile.get("projects_count", 0),
        "github_activity_score": profile.get("github_activity_score", 0),
        "leetcode_rating": profile.get("leetcode_rating", 0),
        "codechef_rating": profile.get("codechef_rating", 0),
        "coding_score": profile.get("coding_score", 0),
        "aptitude_score": profile.get("aptitude_score", 0),
        "communication_score": profile.get("communication_score", 0),
        "attendance_percentage": profile.get("attendance_percentage", 0),
        "certifications_count": profile.get("certifications_count", 0),
        "project_impact_score": profile.get("project_impact_score", 50),
        "certification_impact_score": profile.get("certification_impact_score", 50),
    }

    try:
        score = predict_placement_score(features)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

    # Build category-wise breakdown for the frontend
    breakdown = _build_breakdown(features, score)

    # Save score + breakdown to profile
    try:
        profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": {"placement_score": score, "score_breakdown": breakdown}}
        )
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({
        "placement_score": score,
        "features_used": features,
        "breakdown": breakdown,
    }), 200


def _build_breakdown(features: dict, overall: float) -> dict:
    """
    Group raw feature values into human-readable categories and
    return a percentage strength for each category (0-100).
    """
    cgpa = float(features.get("cgpa", 0))
    internships = float(features.get("internships", 0))
    projects = float(features.get("projects_count", 0))
    github = float(features.get("github_activity_score", 0))
    coding = float(features.get("coding_score", 0))
    aptitude = float(features.get("aptitude_score", 0))
    communication = float(features.get("communication_score", 0))
    attendance = float(features.get("attendance_percentage", 0))
    certs = float(features.get("certifications_count", 0))
    proj_impact = float(features.get("project_impact_score", 0))
    cert_impact = float(features.get("certification_impact_score", 0))

    return {
        "academics": round(min(100, cgpa * 10), 1),
        "coding": round(coding, 1),
        "experience": round(min(100, (internships * 20 + projects * 12)), 1),
        "github_activity": round(github, 1),
        "soft_skills": round((aptitude + communication) / 2, 1),
        "certifications": round(min(100, certs * 12.5 + cert_impact * 0.3), 1),
        "project_quality": round(proj_impact, 1),
        "attendance": round(attendance, 1),
    }


# ── Next-level: Strengths & Weaknesses analysis ──
@predict_bp.route("/predict/strengths/<user_id>", methods=["GET"])
def get_strengths(user_id):
    """Return the user's top 3 strengths and bottom 3 weaknesses."""
    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        profile = profiles_collection.find_one(
            {"user_id": user_id}, {"_id": 0}
        )
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    breakdown = profile.get("score_breakdown")
    if not breakdown:
        return jsonify({"error": "No prediction found. Run /predict first."}), 400

    sorted_cats = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
    strengths = [{"category": k, "score": v} for k, v in sorted_cats[:3]]
    weaknesses = [{"category": k, "score": v} for k, v in sorted_cats[-3:]]

    return jsonify({
        "strengths": strengths,
        "weaknesses": weaknesses,
        "placement_score": profile.get("placement_score", 0),
    }), 200


# ── Next-level: Percentile / peer comparison ──
@predict_bp.route("/predict/percentile/<user_id>", methods=["GET"])
def get_percentile(user_id):
    """Return the user's placement score percentile relative to all users."""
    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        profile = profiles_collection.find_one(
            {"user_id": user_id}, {"_id": 0}
        )
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    user_score = profile.get("placement_score")
    if user_score is None:
        return jsonify({"error": "No prediction found. Run /predict first."}), 400

    try:
        all_scores = [
            doc["placement_score"]
            for doc in profiles_collection.find(
                {"placement_score": {"$exists": True}},
                {"placement_score": 1, "_id": 0}
            )
        ]
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if len(all_scores) < 2:
        return jsonify({
            "percentile": 100,
            "total_users": len(all_scores),
            "placement_score": user_score,
        }), 200

    below = sum(1 for s in all_scores if s < user_score)
    percentile = round(below / len(all_scores) * 100, 1)

    return jsonify({
        "percentile": percentile,
        "total_users": len(all_scores),
        "placement_score": user_score,
    }), 200


# ── Next-level: What-if analysis ──
@predict_bp.route("/predict/what-if", methods=["POST"])
def what_if():
    """
    Accept modified feature values and return a hypothetical score
    without persisting anything. Useful for "what if my CGPA was 8.5?"
    """
    data = request.get_json()

    features = {
        "cgpa": float(data.get("cgpa", 0)),
        "internships": int(data.get("internships", 0)),
        "projects_count": int(data.get("projects_count", 0)),
        "github_activity_score": float(data.get("github_activity_score", 0)),
        "leetcode_rating": float(data.get("leetcode_rating", 0)),
        "codechef_rating": float(data.get("codechef_rating", 0)),
        "coding_score": float(data.get("coding_score", 0)),
        "aptitude_score": float(data.get("aptitude_score", 0)),
        "communication_score": float(data.get("communication_score", 0)),
        "attendance_percentage": float(data.get("attendance_percentage", 0)),
        "certifications_count": int(data.get("certifications_count", 0)),
        "project_impact_score": float(data.get("project_impact_score", 50)),
        "certification_impact_score": float(data.get("certification_impact_score", 50)),
    }

    try:
        score = predict_placement_score(features)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

    breakdown = _build_breakdown(features, score)

    return jsonify({
        "hypothetical_score": score,
        "breakdown": breakdown,
    }), 200
