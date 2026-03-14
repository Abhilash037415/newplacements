"""
ML prediction service.
Loads the pre-trained hybrid stacking model and predicts placement
readiness score.  Applies the same feature engineering used during
training so that train-serve parity is guaranteed.
"""
import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml_model", "placement_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "..", "ml_model", "feature_order.json")

_model = None
_feature_order = None

# Raw profile keys the route must supply
RAW_KEYS = [
    "cgpa", "internships", "projects_count", "github_activity_score",
    "leetcode_rating", "codechef_rating", "coding_score", "aptitude_score",
    "communication_score", "attendance_percentage", "certifications_count",
    "project_impact_score", "certification_impact_score",
]


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Run 'python scripts/train_model.py' first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def _load_feature_order():
    global _feature_order
    if _feature_order is None:
        if os.path.exists(FEATURES_PATH):
            with open(FEATURES_PATH) as f:
                _feature_order = json.load(f)
        else:
            # Fallback to hardcoded list matching train_model.py
            _feature_order = [
                "cgpa", "internships", "projects_count", "github_activity_score",
                "coding_score", "aptitude_score", "communication_score",
                "attendance_percentage", "certifications_count",
                "project_impact_score", "certification_impact_score",
                "platform_strength", "academic_coding_balance",
                "soft_skills_avg", "experience_index", "platform_count",
                "coding_depth",
            ]
    return _feature_order


def _engineer_features(raw: dict) -> dict:
    """Apply the same feature engineering as train_model.py."""
    lc = float(raw.get("leetcode_rating", 0))
    cc = float(raw.get("codechef_rating", 0))

    engineered = dict(raw)  # copy all raw keys
    engineered["platform_strength"] = (lc + cc) / 2
    engineered["academic_coding_balance"] = (
        float(raw.get("cgpa", 0)) * float(raw.get("coding_score", 0)) / 100
    )
    engineered["soft_skills_avg"] = (
        float(raw.get("aptitude_score", 0)) + float(raw.get("communication_score", 0))
    ) / 2
    engineered["experience_index"] = (
        float(raw.get("internships", 0)) * 2.5
        + float(raw.get("projects_count", 0)) * 1.5
    )
    engineered["has_leetcode"] = 1 if lc > 0 else 0
    engineered["has_codechef"] = 1 if cc > 0 else 0
    engineered["platform_count"] = engineered["has_leetcode"] + engineered["has_codechef"]
    engineered["coding_depth"] = (
        float(raw.get("coding_score", 0)) * (1 + engineered["platform_count"] * 0.25)
    )
    return engineered


def predict_placement_score(features: dict) -> float:
    """
    Predict placement readiness score (0-100) given a raw feature dict.
    Automatically applies feature engineering to match training pipeline.
    """
    model = _load_model()
    feature_order = _load_feature_order()

    enriched = _engineer_features(features)
    feature_values = [float(enriched.get(f, 0)) for f in feature_order]
    X = np.array([feature_values])
    prediction = model.predict(X)[0]

    return round(max(0, min(100, prediction)), 2)
