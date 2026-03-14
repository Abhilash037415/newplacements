"""
Resume routes: /resume/upload
Handles PDF resume upload and skill extraction.
"""
from flask import Blueprint, request, jsonify
from db import profiles_collection
from services.resume_service import extract_skills_from_resume

resume_bp = Blueprint("resume", __name__)

ALLOWED_EXTENSIONS = {"pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@resume_bp.route("/resume/upload", methods=["POST"])
def upload_resume():
    user_id = request.form.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    if "resume" not in request.files:
        return jsonify({"error": "No resume file provided"}), 400

    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    # Check file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File too large. Maximum size is 5MB."}), 400

    result = extract_skills_from_resume(file)

    if not result["success"]:
        return jsonify({"error": result["error"]}), 400

    # Save extracted data to profile
    if profiles_collection is not None:
        try:
            update_fields = {
                "extracted_skills": result["skills"],
                "resume_projects": result["projects"],
                "resume_certifications": result["certifications"],
                "resume_uploaded": True,
            }
            profiles_collection.update_one(
                {"user_id": user_id},
                {"$set": update_fields},
                upsert=True,
            )
        except Exception as e:
            return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({
        "message": "Resume processed successfully",
        "skills": result["skills"],
        "projects": result["projects"],
        "certifications": result["certifications"],
    }), 200
