"""
Train placement readiness hybrid stacking model from the CSV dataset.
Uses GradientBoosting + RandomForest + SVR as base learners with Ridge
meta-learner, plus engineered features for better signal extraction.

The target is recomputed at training time with weights reflecting
real-world placement priorities: coding ability, practical experience,
GitHub activity, and soft skills matter most — CGPA is a baseline
qualifier (7+ is fine) rather than a differentiator.

Saves the full pipeline (scaler + stacking model) as placement_model.pkl
"""
import os
import pandas as pd
import numpy as np
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
)
from sklearn.svm import SVR
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# ── Path setup ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
CSV_PATH = os.path.join(BACKEND_DIR, "ml_model", "placement_dataset_5000.csv")
MODEL_DIR = os.path.join(BACKEND_DIR, "ml_model")
MODEL_PATH = os.path.join(MODEL_DIR, "placement_model.pkl")

# ── Load dataset ──
df = pd.read_csv(CSV_PATH)
print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# ── Feature engineering ──
# Combined platform strength
df["platform_strength"] = (df["leetcode_rating"] + df["codechef_rating"]) / 2
# Academic-to-coding balance interaction
df["academic_coding_balance"] = df["cgpa"] * df["coding_score"] / 100
# Soft skills combined
df["soft_skills_avg"] = (df["aptitude_score"] + df["communication_score"]) / 2
# Experience index: internships + projects weighted
df["experience_index"] = df["internships"] * 2.5 + df["projects_count"] * 1.5
# Profile completeness signal
df["has_leetcode"] = (df["leetcode_rating"] > 0).astype(int)
df["has_codechef"] = (df["codechef_rating"] > 0).astype(int)
df["platform_count"] = df["has_leetcode"] + df["has_codechef"]
# Coding depth: coding_score weighted by platform diversity
df["coding_depth"] = df["coding_score"] * (1 + df["platform_count"] * 0.25)

# ── Recompute target with real-world placement priorities ──
# In real placements: coding rounds eliminate most candidates, then
# projects/experience differentiate, soft skills seal the deal.
# CGPA is just a cutoff filter (>= 7 is fine).
np.random.seed(42)
noise = np.random.normal(0, 2.0, len(df))

raw_score = (
    # CGPA: diminishing returns above 7.0 — a 7.0 student isn't far
    # behind a 9.0 student in real placement outcomes
    np.where(df["cgpa"] >= 7.0,
             7.0 * 1.5 + (df["cgpa"] - 7.0) * 0.5,   # 7+ → slow gain
             df["cgpa"] * 1.5)                          # <7 → moderate penalty
    # Coding ability — THE most important differentiator
    + df["coding_score"] * 0.55        # coding prowess (high impact)
    + df["platform_strength"] * 0.012  # raw rating signal
    # Practical experience — what you've built and done
    + df["experience_index"] * 1.8     # internships + projects (very high)
    + df["github_activity_score"] * 0.20  # open-source / activity
    + df["project_impact_score"] * 0.18   # quality of projects
    # Soft skills — communication & aptitude for interviews
    + df["aptitude_score"] * 0.16      # logical / quant aptitude
    + df["communication_score"] * 0.18 # interview communication
    # Supporting factors
    + df["certifications_count"] * 0.6
    + df["certification_impact_score"] * 0.06
    + df["attendance_percentage"] * 0.02
    + noise
)
# Normalise to 15-98 range
raw_min, raw_max = raw_score.min(), raw_score.max()
df["placement_score"] = np.round(
    15 + (raw_score - raw_min) / (raw_max - raw_min) * 83, 2
)
df["placement_score"] = df["placement_score"].clip(15, 98)

print("\n=== Recomputed target correlations ===")
target_corr = df.corr()["placement_score"].drop("placement_score").sort_values(ascending=False)
for feat, corr in target_corr.items():
    print(f"  {feat:35s} {corr:.4f}")

# ── Feature set ──
FEATURES = [
    "cgpa", "internships", "projects_count", "github_activity_score",
    "coding_score", "aptitude_score", "communication_score",
    "attendance_percentage", "certifications_count",
    "project_impact_score", "certification_impact_score",
    # Engineered features
    "platform_strength", "academic_coding_balance",
    "soft_skills_avg", "experience_index", "platform_count",
    "coding_depth",
]
TARGET = "placement_score"

print(f"\nUsing {len(FEATURES)} features: {FEATURES}")

X = df[FEATURES]
y = df[TARGET]

# ── Train-test split ──
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── Hybrid Stacking Ensemble ──
base_models = [
    ("gbr", GradientBoostingRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.08,
        subsample=0.85, random_state=42
    )),
    ("rf", RandomForestRegressor(
        n_estimators=300, max_depth=10, min_samples_leaf=4,
        random_state=42, n_jobs=-1
    )),
    ("svr", SVR(kernel="rbf", C=15, epsilon=0.5)),
]

stacking_model = StackingRegressor(
    estimators=base_models,
    final_estimator=Ridge(alpha=1.0),
    cv=5,
    n_jobs=-1,
)

# Pipeline: scale features (crucial for SVR) then stack
model = Pipeline([
    ("scaler", StandardScaler()),
    ("stacking", stacking_model),
])

print("\nTraining hybrid stacking model (GBR + RF + SVR → Ridge)...")
model.fit(X_train, y_train)

# ── Evaluate ──
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

# Cross-validation on full data
cv_scores = cross_val_score(model, X, y, cv=5, scoring="r2", n_jobs=-1)

print(f"\nModel Performance (Test Set):")
print(f"  MAE:  {mae:.4f}")
print(f"  R²:   {r2:.4f}")
print(f"\nCross-Validation R² (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Feature importance from GBR base model ──
gbr_model = model.named_steps["stacking"].estimators_[0]
importances = gbr_model.feature_importances_
importance_df = pd.DataFrame({
    "feature": FEATURES,
    "importance": importances
}).sort_values("importance", ascending=False)
print(f"\nFeature Importance (from GBR base learner):")
for _, row in importance_df.iterrows():
    bar = "█" * int(row["importance"] * 100)
    print(f"  {row['feature']:30s} {row['importance']:.4f}  {bar}")

# ── Save model ──
os.makedirs(MODEL_DIR, exist_ok=True)
joblib.dump(model, MODEL_PATH)
print(f"\nModel saved to {MODEL_PATH}")

# Also save feature list so prediction_service stays in sync
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_order.json")
import json
with open(FEATURES_PATH, "w") as f:
    json.dump(FEATURES, f, indent=2)
print(f"Feature order saved to {FEATURES_PATH}")
