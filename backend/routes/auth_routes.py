"""
Authentication routes: /login and /register
"""
from flask import Blueprint, request, jsonify
import bcrypt
from db import users_collection

auth_bp = Blueprint("auth", __name__)


def _check_db():
    if users_collection is None:
        return jsonify({"error": "Database unavailable"}), 500
    return None


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid or missing JSON body"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        name = data.get("name", "").strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        db_err = _check_db()
        if db_err:
            return db_err
        # Check if user already exists
        if users_collection.find_one({"email": email}):
            return jsonify({"error": "User already exists"}), 409

        # Hash password
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        user_doc = {
            "email": email,
            "password": hashed.decode("utf-8"),
            "name": name
        }
        result = users_collection.insert_one(user_doc)

        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": str(result.inserted_id),
                "email": email,
                "name": name
            }
        }), 201

    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid or missing JSON body"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        db_err = _check_db()
        if db_err:
            return db_err

        user = users_collection.find_one({"email": email})

        if not user:
            return jsonify({"error": "User not found"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return jsonify({"error": "Invalid password"}), 401

        user["_id"] = str(user["_id"])

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["_id"],
                "email": user["email"],
                "name": user.get("name", "")
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {e}"}), 500
