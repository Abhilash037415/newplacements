"""
Learning roadmap generation service.
Uses Gemini to create personalized week-by-week study plans,
with a rule-based fallback.
"""
import json
from google import genai
from config import Config


def _generate_fallback_roadmap(profile: dict) -> list:
    """Generate a rule-based 4-week roadmap when Gemini is unavailable."""
    weeks = []
    coding = float(profile.get("coding_score", 0))
    aptitude = float(profile.get("aptitude_score", 0))
    comm = float(profile.get("communication_score", 0))
    cgpa = float(profile.get("cgpa", 0))
    projects = int(profile.get("projects_count", 0))
    github_score = float(profile.get("github_activity_score", 0))
    skills = profile.get("extracted_skills", [])
    dsa = profile.get("dsa_analysis", {})
    weak_topics = [t["topic"] for t in dsa.get("weak", [])]
    not_attempted = [t["topic"] for t in dsa.get("not_attempted", [])]
    strong_topics = [t["topic"] for t in dsa.get("strong", [])]

    # Week 1: DSA & Coding foundations — prioritise weak areas
    w1_tasks = [
        "Revise time & space complexity analysis",
        "Complete one sorting algorithm implementation from scratch",
    ]
    if weak_topics or not_attempted:
        priority = (weak_topics + not_attempted)[:4]
        w1_tasks.insert(0, f"Focus on weak/untouched DSA topics: {', '.join(priority)}")
        w1_tasks.append(f"Solve 5 Easy + 3 Medium problems in: {', '.join(priority[:2])}")
    else:
        w1_tasks.insert(0, "Solve 3 Easy + 2 Medium LeetCode problems daily (Arrays, Strings, Hashing)")
    if coding < 40:
        w1_tasks.append("Start with basic data structures: Arrays, Linked Lists, Stacks, Queues")
    elif not strong_topics or len(strong_topics) < 5:
        w1_tasks.append("Practice Trees, Graphs, and Dynamic Programming patterns")
    else:
        w1_tasks.append("Move to Hard problems in your strong topics to deepen mastery")

    w1_resources = [
        {"title": "NeetCode 150", "url": "https://neetcode.io/practice", "type": "practice"},
        {"title": "LeetCode Study Plans", "url": "https://leetcode.com/studyplan/", "type": "practice"},
        {"title": "Abdul Bari Algorithms", "url": "https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O", "type": "video"},
    ]

    weeks.append({
        "week": 1,
        "title": "DSA & Coding Foundations",
        "focus": "Data Structures & Algorithms",
        "tasks": w1_tasks,
        "resources": w1_resources,
    })

    # Week 2: Core CS + Aptitude
    w2_tasks = [
        "Study OS concepts: Process, Threading, Scheduling, Memory Management",
        "Study DBMS: Normalization, SQL queries, Indexing, Transactions",
        "Study CN: OSI layers, TCP/UDP, HTTP, DNS",
    ]
    if aptitude < 60:
        w2_tasks.append("Practice 20 aptitude questions daily on IndiaBix or PrepInsta")
    else:
        w2_tasks.append("Take 2 full-length aptitude mock tests this week")

    w2_resources = [
        {"title": "Gate Smashers (OS, DBMS, CN)", "url": "https://www.youtube.com/@GateSmashers", "type": "video"},
        {"title": "IndiaBix Aptitude", "url": "https://www.indiabix.com/", "type": "practice"},
        {"title": "GeeksforGeeks DBMS", "url": "https://www.geeksforgeeks.org/dbms/", "type": "article"},
    ]

    weeks.append({
        "week": 2,
        "title": "Core CS & Aptitude",
        "focus": "OS, DBMS, CN, Aptitude",
        "tasks": w2_tasks,
        "resources": w2_resources,
    })

    # Week 3: Projects & GitHub
    w3_tasks = [
        "Build/polish one full-stack project with proper README and deployment",
        "Push code daily — aim for a green GitHub contribution graph",
        "Write clean, documented code with proper commit messages",
    ]
    if projects < 3:
        w3_tasks.append("Start a new project: choose from Todo App, Blog Platform, or E-commerce API")
    else:
        w3_tasks.append("Add CI/CD pipeline or Docker setup to an existing project")

    if not skills or len(skills) < 3:
        w3_tasks.append("Learn and integrate a new technology into your project")

    w3_resources = [
        {"title": "Build Projects - Traversy Media", "url": "https://www.youtube.com/@TraversyMedia", "type": "video"},
        {"title": "GitHub Profile README Guide", "url": "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile", "type": "article"},
        {"title": "Vercel (Deploy Projects)", "url": "https://vercel.com/", "type": "tool"},
    ]

    weeks.append({
        "week": 3,
        "title": "Projects & GitHub",
        "focus": "Portfolio Building",
        "tasks": w3_tasks,
        "resources": w3_resources,
    })

    # Week 4: Interview Prep & Communication
    w4_tasks = [
        "Practice 2 mock interviews on Pramp or with a peer",
        "Prepare STAR-format answers for 10 common behavioral questions",
        "Study system design basics: Load Balancer, Caching, Database Sharding",
    ]
    if comm < 60:
        w4_tasks.append("Record yourself explaining a project — practice clarity and confidence")
    else:
        w4_tasks.append("Practice explaining complex technical concepts in simple terms")

    w4_resources = [
        {"title": "Pramp - Free Mock Interviews", "url": "https://www.pramp.com/", "type": "practice"},
        {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "article"},
        {"title": "InterviewBit", "url": "https://www.interviewbit.com/", "type": "practice"},
    ]

    weeks.append({
        "week": 4,
        "title": "Interview Prep & Communication",
        "focus": "Mock Interviews & Soft Skills",
        "tasks": w4_tasks,
        "resources": w4_resources,
    })

    return weeks


def generate_learning_roadmap(profile: dict) -> list:
    """
    Generate a personalized 4-week learning roadmap.
    Uses Gemini AI when available, falls back to rule-based generation.

    Returns:
        list of week objects with: week, title, focus, tasks, resources
    """
    if not Config.GEMINI_API_KEY:
        return _generate_fallback_roadmap(profile)

    try:
        client = genai.Client(api_key=Config.GEMINI_API_KEY)

        skills = profile.get("extracted_skills", [])
        skills_str = ", ".join(skills[:20]) if skills else "Not provided"

        # DSA analysis summary
        dsa = profile.get("dsa_analysis", {})
        weak_t = [t["topic"] for t in dsa.get("weak", [])]
        not_att = [t["topic"] for t in dsa.get("not_attempted", [])]
        strong_t = [t["topic"] for t in dsa.get("strong", [])]
        moderate_t = [t["topic"] for t in dsa.get("moderate", [])]
        lc_easy = profile.get("leetcode_easy", 0)
        lc_med = profile.get("leetcode_medium", 0)
        lc_hard = profile.get("leetcode_hard", 0)

        dsa_str = ""
        if weak_t or not_att:
            dsa_str = (
                f"\nDSA Analysis (from LeetCode):"
                f"\n  Easy Solved: {lc_easy}, Medium: {lc_med}, Hard: {lc_hard}"
                f"\n  Strong Topics: {', '.join(strong_t[:8]) or 'None'}"
                f"\n  Moderate Topics: {', '.join(moderate_t[:8]) or 'None'}"
                f"\n  Weak Topics (need work): {', '.join(weak_t) or 'None'}"
                f"\n  Not Attempted: {', '.join(not_att) or 'None'}"
            )

        summary = (
            f"CGPA: {profile.get('cgpa', 'N/A')}, "
            f"Internships: {profile.get('internships', 0)}, "
            f"Projects: {profile.get('projects_count', 0)}, "
            f"Coding Score: {profile.get('coding_score', 0)}/100, "
            f"Aptitude Score: {profile.get('aptitude_score', 0)}/100, "
            f"Communication Score: {profile.get('communication_score', 0)}/100, "
            f"GitHub Score: {profile.get('github_activity_score', 'N/A')}, "
            f"LeetCode Rating: {profile.get('leetcode_rating', 0)}, "
            f"LeetCode Problems Solved: {profile.get('leetcode_problems_solved', 0)}, "
            f"CodeChef Rating: {profile.get('codechef_rating', 0)}, "
            f"Certifications: {profile.get('certifications_count', 0)}, "
            f"Known Skills: {skills_str}"
            f"{dsa_str}"
        )

        prompt = (
            "You are an expert career counsellor for engineering students preparing for campus placements.\n"
            "Create a personalized 4-WEEK learning roadmap based on this student's profile.\n"
            "IMPORTANT: The roadmap MUST prioritise the student's WEAK and NOT-ATTEMPTED DSA topics.\n"
            "Week 1 should focus heavily on their weakest DSA areas with specific problem recommendations.\n\n"
            f"Student Profile:\n{summary}\n\n"
            "For each week, provide:\n"
            "- week (number 1-4)\n"
            "- title (short heading)\n"
            "- focus (one-line focus area)\n"
            "- tasks (array of 3-5 specific, actionable tasks)\n"
            "- resources (array of 2-3 objects with: title, url, type where type is 'video'|'practice'|'article'|'tool')\n\n"
            "Rules:\n"
            "- Tasks must be specific and tied to weak DSA topics and other weak areas\n"
            "- Mention specific LeetCode problem names or patterns for weak topics\n"
            "- Resources must be real, well-known platforms (LeetCode, GeeksforGeeks, YouTube channels, etc.)\n"
            "- Respond ONLY with a valid JSON array of 4 week objects\n"
            "- No markdown, no extra text — just the JSON array"
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0].strip()
        roadmap = json.loads(text)
        if isinstance(roadmap, list) and len(roadmap) > 0:
            return roadmap[:4]
        return _generate_fallback_roadmap(profile)
    except Exception as e:
        print(f"Gemini roadmap error: {e}")
        return _generate_fallback_roadmap(profile)
