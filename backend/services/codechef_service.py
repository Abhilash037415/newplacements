"""
CodeChef integration for fetching user stats.
Scrapes the public CodeChef profile page and extracts data from
the embedded Drupal settings JSON + HTML content.
"""
import re
import json
import requests

_PROFILE_URL = "https://www.codechef.com/users/{}"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
}


def get_codechef_stats(username: str) -> dict:
    """
    Fetch CodeChef user stats by scraping the public profile page.

    Returns:
        dict with keys: valid, error, rating, stars, highest_rating,
                        problems_solved, global_rank, country_rank,
                        contests_attended
    """
    if not username or not username.strip():
        return {"valid": False, "error": "CodeChef username is required"}

    username = username.strip()

    try:
        resp = requests.get(
            _PROFILE_URL.format(username),
            headers=_HEADERS,
            timeout=15,
        )

        if resp.status_code != 200:
            return {"valid": False, "error": f"CodeChef user '{username}' not found"}

        html = resp.text

        # ── Quick check: page exists? ──
        if "Page Not Found" in html or f"/users/{username}" not in html:
            return {"valid": False, "error": f"CodeChef user '{username}' not found"}

        # ── Rating from Drupal settings JSON (most reliable) ──
        rating = 0
        highest_rating = 0
        contests_attended = 0

        drupal_m = re.search(
            r"jQuery\.extend\(Drupal\.settings,\s*(\{.*?\})\);",
            html,
            re.DOTALL,
        )
        if drupal_m:
            try:
                ds = json.loads(drupal_m.group(1))
                all_ratings = ds.get("date_versus_rating", {}).get("all", [])
                contests_attended = len(all_ratings)
                if all_ratings:
                    rating = int(all_ratings[-1].get("rating", 0))
                    highest_rating = max(
                        int(r.get("rating", 0)) for r in all_ratings
                    )
            except (json.JSONDecodeError, ValueError):
                pass

        # ── Fallback: rating from HTML ──
        if rating == 0:
            rn = re.search(r'rating-number">\s*(\d+)', html)
            if rn:
                rating = int(rn.group(1))

        # ── Highest rating from HTML ──
        if highest_rating == 0:
            hr = re.search(r"Highest Rating\s*(\d+)", html)
            if hr:
                highest_rating = int(hr.group(1))

        # ── Stars ──
        stars = 0
        star_div = re.search(r"rating-star.*?</div>", html, re.DOTALL)
        if star_div:
            stars = star_div.group().count("&#9733;")

        # ── Problems solved ──
        problems_solved = 0
        ps = re.search(r"Total Problems Solved:\s*(\d+)", html)
        if ps:
            problems_solved = int(ps.group(1))

        # ── Global rank ──
        global_rank = 0
        gr = re.search(r"Global Rank.*?<strong>(\d+)", html, re.DOTALL)
        if gr:
            global_rank = int(gr.group(1))

        # ── Country rank ──
        country_rank = 0
        cr = re.search(r"Country Rank.*?<strong>(\d+)", html, re.DOTALL)
        if cr:
            country_rank = int(cr.group(1))

        return {
            "valid": True,
            "error": None,
            "username": username,
            "rating": rating,
            "highest_rating": highest_rating,
            "stars": str(stars),
            "problems_solved": problems_solved,
            "global_rank": global_rank,
            "country_rank": country_rank,
            "contests_attended": contests_attended,
        }

    except requests.exceptions.Timeout:
        return {"valid": False, "error": "CodeChef request timed out"}
    except Exception as e:
        return {"valid": False, "error": f"CodeChef error: {e}"}
