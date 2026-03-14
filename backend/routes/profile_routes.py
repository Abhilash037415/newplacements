"""
Profile routes: /profile/update and /profile/<user_id>
"""
from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import profiles_collection
from services.gemini_service import (
    generate_project_impact_score,
    generate_certification_impact_score
)
from services.github_service import get_github_activity_score, verify_github_username
from services.leetcode_service import get_leetcode_stats
from services.codechef_service import get_codechef_stats

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile/update", methods=["POST"])
def update_profile():
    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    if profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    # Extract form fields
    resume_projects = data.get("resume_projects", [])
    resume_certifications = data.get("resume_certifications", [])

    # Build text descriptions from structured resume data for Gemini scoring
    project_description = "\n".join(
        f"{p.get('name','')}: {p.get('description','')} [{', '.join(p.get('technologies',[]))}]"
        for p in resume_projects if isinstance(p, dict) and p.get("name")
    )
    certification_details = "\n".join(
        f"{c.get('name','')}" + (f" — {c['issuer']}" if c.get("issuer") else "")
        for c in resume_certifications if isinstance(c, dict) and c.get("name")
    )

    profile = {
        "user_id": user_id,
        "cgpa": float(data.get("cgpa", 0)),
        "internships": int(data.get("internships", 0)),
        "projects_count": max(int(data.get("projects_count", 0)), len(resume_projects)),
        "github_username": data.get("github_username", "").strip(),
        "leetcode_username": data.get("leetcode_username", "").strip(),
        "codechef_username": data.get("codechef_username", "").strip(),
        "aptitude_score": float(data.get("aptitude_score", 0)),
        "communication_score": float(data.get("communication_score", 0)),
        "attendance_percentage": float(data.get("attendance_percentage", 0)),
        "certifications_count": max(int(data.get("certifications_count", 0)), len(resume_certifications)),
        "project_description": project_description,
        "certification_details": certification_details,
        "extracted_skills": data.get("extracted_skills", []),
        "manual_skills": data.get("manual_skills", []),
        "resume_projects": resume_projects,
        "resume_certifications": resume_certifications,
    }

    # Merge extracted + manual skills (deduplicated, case-insensitive)
    seen = set()
    all_skills = []
    for s in list(profile["extracted_skills"]) + list(profile["manual_skills"]):
        if isinstance(s, str) and s.strip() and s.strip().lower() not in seen:
            seen.add(s.strip().lower())
            all_skills.append(s.strip())
    profile["all_skills"] = all_skills

    # --- Generate impact scores via Gemini ---
    project_impact_score = generate_project_impact_score(project_description)
    certification_impact_score = generate_certification_impact_score(certification_details)
    profile["project_impact_score"] = project_impact_score
    profile["certification_impact_score"] = certification_impact_score

    # --- Verify and score GitHub profile ---
    github_username = profile["github_username"]
    if not github_username:
        return jsonify({"error": "GitHub username is required"}), 400

    github_data = get_github_activity_score(github_username)
    if not github_data["valid"]:
        return jsonify({"error": github_data["error"]}), 400

    profile["github_verified"] = True
    profile["github_activity_score"] = github_data["github_activity_score"]
    profile["github_repos"] = github_data["repos"]
    profile["github_stars"] = github_data["stars"]
    profile["github_language_diversity"] = github_data["language_diversity"]
    profile["github_recent_activity"] = github_data["recent_activity"]

    # --- Fetch LeetCode stats ---
    lc_username = profile["leetcode_username"]
    if lc_username:
        lc_data = get_leetcode_stats(lc_username)
        if lc_data["valid"]:
            profile["leetcode_rating"] = lc_data["rating"]
            profile["leetcode_problems_solved"] = lc_data["problems_solved"]
            profile["leetcode_easy"] = lc_data["easy_solved"]
            profile["leetcode_medium"] = lc_data["medium_solved"]
            profile["leetcode_hard"] = lc_data["hard_solved"]
            profile["leetcode_ranking"] = lc_data["ranking"]
            profile["leetcode_contests"] = lc_data["contests_attended"]
            profile["leetcode_verified"] = True
            # DSA topic analysis
            profile["leetcode_topic_stats"] = lc_data.get("topic_stats", [])
            profile["dsa_analysis"] = lc_data.get("dsa_analysis", {})
        else:
            profile["leetcode_rating"] = 0
            profile["leetcode_verified"] = False
            profile["leetcode_topic_stats"] = []
            profile["dsa_analysis"] = {}
    else:
        profile["leetcode_rating"] = 0
        profile["leetcode_verified"] = False
        profile["leetcode_topic_stats"] = []
        profile["dsa_analysis"] = {}

    # --- Fetch CodeChef stats ---
    cc_username = profile["codechef_username"]
    if cc_username:
        cc_data = get_codechef_stats(cc_username)
        if cc_data["valid"]:
            profile["codechef_rating"] = cc_data["rating"]
            profile["codechef_highest_rating"] = cc_data["highest_rating"]
            profile["codechef_stars"] = cc_data["stars"]
            profile["codechef_problems_solved"] = cc_data["problems_solved"]
            profile["codechef_global_rank"] = cc_data["global_rank"]
            profile["codechef_verified"] = True
        else:
            profile["codechef_rating"] = 0
            profile["codechef_verified"] = False
    else:
        profile["codechef_rating"] = 0
        profile["codechef_verified"] = False

    # --- Auto-compute coding_score from LeetCode + CodeChef ---
    lc_rating = float(profile.get("leetcode_rating", 0))
    cc_rating = float(profile.get("codechef_rating", 0))
    lc_solved = int(profile.get("leetcode_problems_solved", 0))
    cc_solved = int(profile.get("codechef_problems_solved", 0))
    lc_easy = int(profile.get("leetcode_easy", 0))
    lc_medium = int(profile.get("leetcode_medium", 0))
    lc_hard = int(profile.get("leetcode_hard", 0))

    # Normalise LeetCode rating: ~1500 is beginner, ~2500+ is expert
    lc_norm = min(100, max(0, (lc_rating - 1200) / 13))  # 1200->0, 2500->100
    # Normalise CodeChef rating: 1000 baseline, 2200+ expert
    cc_norm = min(100, max(0, (cc_rating - 1000) / 12))   # 1000->0, 2200->100
    # Problems solved contribution (capped at 30 points)
    solve_norm = min(30, (lc_solved + cc_solved) * 0.05)
    # Weighted blend: 40% LC rating, 30% CC rating, 30% solve volume
    coding_score = 0
    active_sources = 0
    if lc_rating > 0:
        coding_score += lc_norm * 0.4
        active_sources += 1
    if cc_rating > 0:
        coding_score += cc_norm * 0.3
        active_sources += 1
    if lc_solved + cc_solved > 0:
        coding_score += solve_norm
        active_sources += 1
    # If only one platform is used, scale up proportionally
    if active_sources > 0 and coding_score > 0:
        coding_score = min(100, coding_score * (3 / active_sources) * 0.45)

    # Difficulty bonus: medium/hard problems are worth more
    if lc_solved > 0:
        difficulty_ratio = (lc_medium + lc_hard * 2.5) / max(lc_solved, 1)
        difficulty_bonus = min(8, difficulty_ratio * 3)
        coding_score = min(100, coding_score + difficulty_bonus)

    profile["coding_score"] = round(max(0, min(100, coding_score)), 1)

    # Upsert profile in MongoDB
    try:
        profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": profile},
            upsert=True
        )
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({
        "message": "Profile updated successfully",
        "profile": profile
    }), 200


@profile_bp.route("/profile/<user_id>", methods=["GET"])
def get_profile(user_id):
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

    return jsonify({"profile": profile}), 200
