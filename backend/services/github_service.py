"""
GitHub API integration for verifying profiles and computing a github_activity_score.
Uses the public GitHub API (no auth required for public profiles).
"""
import requests
from datetime import datetime, timezone, timedelta


def verify_github_username(username: str) -> dict:
    """
    Verify that a GitHub username exists via the GitHub API.

    Returns:
        dict with keys: valid (bool), error (str|None), user_data (dict|None)
    """
    if not username or not username.strip():
        return {"valid": False, "error": "GitHub username is required", "user_data": None}

    try:
        headers = {"Accept": "application/vnd.github.v3+json"}
        resp = requests.get(
            f"https://api.github.com/users/{username.strip()}",
            headers=headers, timeout=10
        )
        if resp.status_code != 200:
            return {"valid": False, "error": "Invalid GitHub username", "user_data": None}
        return {"valid": True, "error": None, "user_data": resp.json()}
    except Exception as e:
        return {"valid": False, "error": f"GitHub API error: {e}", "user_data": None}


def get_github_activity_score(username: str) -> dict:
    """
    Verify a GitHub username, fetch repo metrics, and compute an activity score.

    Metrics:
        - repository_count: number of public repos
        - total_stars: sum of stargazers_count across repos
        - language_diversity: number of unique programming languages
        - recent_activity: repos updated within the last 12 months

    Score formula:
        score = (0.35 * repository_count) + (0.25 * total_stars)
              + (0.20 * language_diversity * 5) + (0.20 * recent_activity)
        Clamped to [0, 100].

    Returns:
        dict with keys: valid, error, repos, stars, language_diversity,
                        recent_activity, github_activity_score
    """
    verification = verify_github_username(username)
    if not verification["valid"]:
        return {
            "valid": False,
            "error": verification["error"],
            "repos": 0,
            "stars": 0,
            "language_diversity": 0,
            "recent_activity": 0,
            "github_activity_score": 0,
        }

    user_data = verification["user_data"]
    repository_count = user_data.get("public_repos", 0)

    # Fetch repos
    try:
        headers = {"Accept": "application/vnd.github.v3+json"}
        repos_resp = requests.get(
            f"https://api.github.com/users/{username.strip()}/repos?per_page=100&sort=updated",
            headers=headers, timeout=10
        )
        repos = repos_resp.json() if repos_resp.status_code == 200 else []
    except Exception:
        repos = []

    # Extract metrics
    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)

    languages = set()
    for repo in repos:
        lang = repo.get("language")
        if lang:
            languages.add(lang)
    language_diversity = len(languages)

    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    recent_activity = 0
    for repo in repos:
        updated_at = repo.get("updated_at", "")
        if updated_at:
            try:
                repo_date = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                if repo_date >= cutoff:
                    recent_activity += 1
            except (ValueError, TypeError):
                pass

    # Compute score
    raw_score = (
        (0.35 * repository_count)
        + (0.25 * total_stars)
        + (0.20 * language_diversity * 5)
        + (0.20 * recent_activity)
    )
    activity_score = round(max(0, min(100, raw_score)))

    return {
        "valid": True,
        "error": None,
        "repos": repository_count,
        "stars": total_stars,
        "language_diversity": language_diversity,
        "recent_activity": recent_activity,
        "github_activity_score": activity_score,
    }
