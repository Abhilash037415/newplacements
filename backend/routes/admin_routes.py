from flask import Blueprint, request, jsonify
from config import Config
from db import users_collection, profiles_collection

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Check secret credentials
    if email == Config.OFFICER_EMAIL and password == Config.OFFICER_PASSWORD:
        return jsonify({
            "message": "Admin login successful",
            "user": {
                "id": "admin-system-id",
                "email": email,
                "name": "Placement Officer",
                "role": "officer"
            }
        }), 200
    
    return jsonify({"error": "Invalid admin credentials"}), 401


@admin_bp.route("/students", methods=["GET"])
def get_all_students():
    """Fetch a complete list of all registered students with profile summaries."""
    if users_collection is None or profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        # Fetch basic user data
        users_cursor = users_collection.find({}, {"password": 0})
        users_list = {str(u["_id"]): {"id": str(u["_id"]), "name": u.get("name"), "email": u.get("email")} for u in users_cursor}

        # Fetch profile data
        profiles_cursor = profiles_collection.find({}, {"_id": 0})
        
        # Merge profile stats into user data
        for p in profiles_cursor:
            uid = p.get("user_id")
            if uid in users_list:
                users_list[uid]["cgpa"] = p.get("cgpa", "N/A")
                users_list[uid]["department"] = p.get("department", "N/A")
                users_list[uid]["github"] = p.get("github_username", "Unverified")
                users_list[uid]["placement_score"] = p.get("placement_score", "Not Predicted")

        # Create flat list
        final_list = list(users_list.values())
        return jsonify({"students": final_list}), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500


@admin_bp.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    """Fetch only users who have a calculated placement score, ranked descending."""
    if users_collection is None or profiles_collection is None:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        # Only get profiles that have been predicted
        ranked_profiles = list(profiles_collection.find(
            {"placement_score": {"$exists": True, "$type": ["double", "int"]}}, 
            {"user_id": 1, "placement_score": 1, "github_username": 1, "cgpa": 1, "department": 1, "name": 1, "_id": 0}
        ).sort("placement_score", -1).limit(50)) # Limit to top 50 for performance

        # Enrich with real names from users_collection if not stored reliably in profile
        for prof in ranked_profiles:
            user_doc = users_collection.find_one({"_id": prof["user_id"]})  # Note: _id is ObjectId, user_id is string. Needs fix below.
            
            # Since user_id in profiles is stringified ObjectId:
            # We handle fetching names separately or assume the name is there.
            # But the student registration has 'name' in users_collection, we'll try to find it.
            
            # (In my frontend, names are stored in the user session. We will join them here explicitly)
            
        # Proper Join:
        results = []
        for p in ranked_profiles:
            uid = p.get("user_id")
            # Convert string ID to objectId query or fetch string matched.
            user_doc = users_collection.find_one({"email": p.get("email")}) # Alternative if email stored
            
            # Try to fetch from user DB:
            from bson.objectid import ObjectId
            try:
                user = users_collection.find_one({"_id": ObjectId(uid)})
                name = user.get("name", "Unknown Student") if user else p.get("name", "Unknown Student")
            except:
                name = p.get("name", "Unknown Student")

            results.append({
                "user_id": uid,
                "name": name,
                "department": p.get("department", "Unknown"),
                "cgpa": p.get("cgpa", 0),
                "github": p.get("github_username", "Unknown"),
                "score": p.get("placement_score")
            })
            
        # Re-sort just in case
        results.sort(key=lambda x: x["score"], reverse=True)
        return jsonify({"leaderboard": results}), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500
