from flask import Flask
from flask_cors import CORS
from config import Config
from db import mongo_client
from routes.auth_routes import auth_bp
from routes.profile_routes import profile_bp
from routes.predict_routes import predict_bp
from routes.github_routes import github_bp
from routes.suggestion_routes import suggestion_bp
from routes.coding_routes import coding_bp
from routes.resume_routes import resume_bp
from routes.roadmap_routes import roadmap_bp
from routes.admin_routes import admin_bp
from routes.interview_routes import interview_bp, speech_bp
from routes.announcement_routes import announcement_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(predict_bp, url_prefix="/api")
    app.register_blueprint(github_bp, url_prefix="/api")
    app.register_blueprint(suggestion_bp, url_prefix="/api")
    app.register_blueprint(coding_bp, url_prefix="/api")
    app.register_blueprint(resume_bp, url_prefix="/api")
    app.register_blueprint(roadmap_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(interview_bp, url_prefix="/interview")
    app.register_blueprint(speech_bp)
    app.register_blueprint(announcement_bp, url_prefix="/api")

    @app.route("/")
    def index():
        return {"message": "Placement Readiness Predictor API is running"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
