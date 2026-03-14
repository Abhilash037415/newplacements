"""
LeetCode API integration for fetching user stats and DSA topic analysis.
Uses the public LeetCode GraphQL API.
"""
import requests


LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

# Minimum problems to consider a topic "attempted"
_MIN_SOLVED_FOR_STRONG = 10
_MIN_SOLVED_FOR_WEAK = 3

# Core DSA topics that matter for placements
CORE_DSA_TOPICS = [
    "Array", "String", "Hash Table", "Dynamic Programming", "Math",
    "Sorting", "Greedy", "Binary Search", "Tree", "Graph",
    "Depth-First Search", "Breadth-First Search", "Stack", "Queue",
    "Linked List", "Heap (Priority Queue)", "Recursion", "Backtracking",
    "Sliding Window", "Two Pointers", "Bit Manipulation", "Trie",
    "Union Find", "Divide and Conquer", "Matrix",
]


def get_leetcode_stats(username: str) -> dict:
    """
    Fetch LeetCode user stats via the public GraphQL API.
    Includes basic stats + topic-wise problem counts.
    """
    if not username or not username.strip():
        return {"valid": False, "error": "LeetCode username is required"}

    username = username.strip()

    query = """
    query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                ranking
            }
            submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
            tagProblemCounts {
                advanced { tagName tagSlug problemsSolved }
                intermediate { tagName tagSlug problemsSolved }
                fundamental { tagName tagSlug problemsSolved }
            }
        }
        userContestRanking(username: $username) {
            rating
            attendedContestsCount
        }
    }
    """

    try:
        resp = requests.post(
            LEETCODE_GRAPHQL_URL,
            json={"query": query, "variables": {"username": username}},
            headers={"Content-Type": "application/json"},
            timeout=15,
        )

        if resp.status_code != 200:
            return {"valid": False, "error": "LeetCode API request failed"}

        data = resp.json().get("data", {})
        user = data.get("matchedUser")

        if not user:
            return {"valid": False, "error": f"LeetCode user '{username}' not found"}

        # Parse submission stats
        ac_stats = user.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
        easy = medium = hard = total = 0
        for item in ac_stats:
            diff = item.get("difficulty", "")
            count = item.get("count", 0)
            if diff == "Easy":
                easy = count
            elif diff == "Medium":
                medium = count
            elif diff == "Hard":
                hard = count
            elif diff == "All":
                total = count

        # Contest rating
        contest_data = data.get("userContestRanking")
        rating = 0
        contests_attended = 0
        if contest_data:
            rating = round(contest_data.get("rating", 0))
            contests_attended = contest_data.get("attendedContestsCount", 0)

        ranking = user.get("profile", {}).get("ranking", 0) or 0

        # ── Topic-wise stats ──
        topic_stats = _parse_topic_stats(user.get("tagProblemCounts"))
        dsa_analysis = _analyse_dsa_topics(topic_stats)

        return {
            "valid": True,
            "error": None,
            "username": username,
            "rating": rating,
            "problems_solved": total,
            "easy_solved": easy,
            "medium_solved": medium,
            "hard_solved": hard,
            "ranking": ranking,
            "contests_attended": contests_attended,
            "topic_stats": topic_stats,
            "dsa_analysis": dsa_analysis,
        }

    except requests.exceptions.Timeout:
        return {"valid": False, "error": "LeetCode API timed out"}
    except Exception as e:
        return {"valid": False, "error": f"LeetCode API error: {e}"}


def _parse_topic_stats(tag_data: dict | None) -> list:
    """
    Flatten the fundamental / intermediate / advanced buckets into
    a single list of {tag, slug, solved, level} sorted by solved desc.
    """
    if not tag_data:
        return []

    topics = []
    for level in ("fundamental", "intermediate", "advanced"):
        for item in tag_data.get(level, []):
            topics.append({
                "tag": item.get("tagName", ""),
                "slug": item.get("tagSlug", ""),
                "solved": item.get("problemsSolved", 0),
                "level": level,
            })

    # Merge duplicates (same tag can appear in multiple levels)
    merged = {}
    for t in topics:
        key = t["tag"]
        if key in merged:
            merged[key]["solved"] += t["solved"]
        else:
            merged[key] = {**t}

    result = sorted(merged.values(), key=lambda x: x["solved"], reverse=True)
    return result


def _analyse_dsa_topics(topic_stats: list) -> dict:
    """
    Classify DSA topics into strong, moderate, weak, and not_attempted
    based on the number of problems solved.
    """
    topic_map = {t["tag"]: t["solved"] for t in topic_stats}

    strong = []
    moderate = []
    weak = []
    not_attempted = []

    for topic in CORE_DSA_TOPICS:
        solved = topic_map.get(topic, 0)
        if solved >= _MIN_SOLVED_FOR_STRONG:
            strong.append({"topic": topic, "solved": solved})
        elif solved >= _MIN_SOLVED_FOR_WEAK:
            moderate.append({"topic": topic, "solved": solved})
        elif solved > 0:
            weak.append({"topic": topic, "solved": solved})
        else:
            not_attempted.append({"topic": topic, "solved": 0})

    # Sort each bucket by solved count
    strong.sort(key=lambda x: x["solved"], reverse=True)
    moderate.sort(key=lambda x: x["solved"], reverse=True)
    weak.sort(key=lambda x: x["solved"])

    return {
        "strong": strong,
        "moderate": moderate,
        "weak": weak,
        "not_attempted": not_attempted,
        "total_core_topics": len(CORE_DSA_TOPICS),
        "topics_attempted": len(strong) + len(moderate) + len(weak),
    }
