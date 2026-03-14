"""
Gemini API integration for generating impact scores.
Sends project descriptions and certification details to Gemini
and returns numeric impact scores (0-100).
"""
from google import genai
from config import Config


def _get_client():
    return genai.Client(api_key=Config.GEMINI_API_KEY)


def generate_project_impact_score(project_description: str) -> float:
    """
    Send project description to Gemini and get a project impact score (0-100).
    """
    if not project_description or not project_description.strip():
        return 50.0  # default mid-range score

    try:
        client = _get_client()
        prompt = (
            "You are an expert placement evaluator. Based on the following student project description, "
            "rate the project's impact on placement readiness on a scale of 0 to 100. "
            "Consider factors like complexity, technologies used, real-world applicability, and innovation. "
            "Respond with ONLY a single integer number between 0 and 100, nothing else.\n\n"
            f"Project Description:\n{project_description}"
        )
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        score = float(response.text.strip())
        return max(0, min(100, score))
    except Exception as e:
        print(f"Gemini project scoring error: {e}")
        return 50.0


def generate_certification_impact_score(certification_details: str) -> float:
    """
    Send certification/workshop details to Gemini and get an impact score (0-100).
    """
    if not certification_details or not certification_details.strip():
        return 50.0

    try:
        client = _get_client()
        prompt = (
            "You are an expert placement evaluator. Based on the following student certifications "
            "and workshop details, rate their impact on placement readiness on a scale of 0 to 100. "
            "Consider factors like relevance to industry, credibility of the issuing organization, "
            "and skill coverage. "
            "Respond with ONLY a single integer number between 0 and 100, nothing else.\n\n"
            f"Certification / Workshop Details:\n{certification_details}"
        )
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        score = float(response.text.strip())
        return max(0, min(100, score))
    except Exception as e:
        print(f"Gemini certification scoring error: {e}")
        return 50.0


def _generate_fallback_suggestions(profile_data: dict) -> list:
    """Generate rule-based suggestions when Gemini is unavailable."""
    suggestions = []

    cgpa = float(profile_data.get("cgpa", 0))
    if cgpa < 7.0:
        suggestions.append({
            "title": "Improve Your Academic Performance",
            "detail": f"Your CGPA is {cgpa}. Focus on core subjects and aim for at least 7.5+ to clear most company cutoffs."
        })

    internships = int(profile_data.get("internships", 0))
    if internships < 2:
        suggestions.append({
            "title": "Gain More Internship Experience",
            "detail": "Apply for internships on platforms like Internshala, LinkedIn, and AngelList. Real-world experience significantly boosts placement chances."
        })

    coding = float(profile_data.get("coding_score", 0))
    if coding < 60:
        suggestions.append({
            "title": "Strengthen Your Coding Skills",
            "detail": f"Your coding score is {coding}/100. Practice DSA on LeetCode and CodeChef daily — aim for at least 2 problems per day."
        })

    projects = int(profile_data.get("projects_count", 0))
    if projects < 3:
        suggestions.append({
            "title": "Build More Real-World Projects",
            "detail": "Create full-stack or domain-specific projects and deploy them. Recruiters value practical, demonstrable work."
        })

    aptitude = float(profile_data.get("aptitude_score", 0))
    if aptitude < 60:
        suggestions.append({
            "title": "Practice Aptitude & Reasoning",
            "detail": f"Your aptitude score is {aptitude}/100. Use IndiaBix or PrepInsta to practice quantitative, logical, and verbal reasoning daily."
        })

    comm = float(profile_data.get("communication_score", 0))
    if comm < 60:
        suggestions.append({
            "title": "Enhance Communication Skills",
            "detail": "Join a speaking club, practice mock interviews, and read English articles daily to improve fluency and confidence."
        })

    github_score = profile_data.get("github_activity_score", 0)
    if github_score is not None and float(github_score) < 50:
        suggestions.append({
            "title": "Increase GitHub Activity",
            "detail": "Commit code regularly, contribute to open source, and keep your profile green. Active GitHub profiles impress recruiters."
        })

    certs = int(profile_data.get("certifications_count", 0))
    if certs < 2:
        suggestions.append({
            "title": "Earn Industry Certifications",
            "detail": "Get certified in cloud (AWS/Azure), data science, or web development from platforms like Coursera or Google."
        })

    # Always return exactly 5
    default_suggestions = [
        {"title": "Prepare for Technical Interviews", "detail": "Study system design basics, OOP concepts, and practice whiteboard coding. Focus on the top 100 LeetCode problems."},
        {"title": "Build a Strong Online Presence", "detail": "Maintain active LinkedIn, GitHub, and portfolio website. Share your projects and learning journey."},
        {"title": "Network with Industry Professionals", "detail": "Attend tech meetups, hackathons, and webinars. Connect with alumni working in your target companies."},
        {"title": "Master Core CS Fundamentals", "detail": "Review OS, DBMS, CN, and OOP concepts thoroughly. These are asked in almost every technical interview."},
        {"title": "Practice Mock Interviews Regularly", "detail": "Use platforms like Pramp or InterviewBit for peer mock interviews. Simulate real interview pressure."},
    ]

    # Fill up to 5 with defaults
    for s in default_suggestions:
        if len(suggestions) >= 5:
            break
        if not any(existing["title"] == s["title"] for existing in suggestions):
            suggestions.append(s)

    return suggestions[:5]


def generate_profile_suggestions(profile_data: dict) -> list:
    """
    Analyse the full student profile and return actionable placement-readiness
    suggestions as a JSON array of objects with 'title' and 'detail' keys.
    Falls back to rule-based suggestions if Gemini is unavailable.
    """
    if not Config.GEMINI_API_KEY:
        print("Gemini API key not configured — using fallback suggestions")
        return _generate_fallback_suggestions(profile_data)

    try:
        client = _get_client()

        # DSA analysis enrichment
        dsa = profile_data.get("dsa_analysis", {})
        weak_t = [t["topic"] for t in dsa.get("weak", [])]
        not_att = [t["topic"] for t in dsa.get("not_attempted", [])]
        strong_t = [t["topic"] for t in dsa.get("strong", [])]

        dsa_str = ""
        if weak_t or not_att:
            dsa_str = (
                f"\nDSA Topic Analysis:"
                f"\n  LeetCode Easy: {profile_data.get('leetcode_easy', 0)}, "
                f"Medium: {profile_data.get('leetcode_medium', 0)}, "
                f"Hard: {profile_data.get('leetcode_hard', 0)}"
                f"\n  Strong Topics: {', '.join(strong_t[:8]) or 'None'}"
                f"\n  Weak Topics: {', '.join(weak_t) or 'None'}"
                f"\n  Not Attempted: {', '.join(not_att) or 'None'}"
            )

        summary = (
            f"CGPA: {profile_data.get('cgpa', 'N/A')}, "
            f"Internships: {profile_data.get('internships', 0)}, "
            f"Projects: {profile_data.get('projects_count', 0)}, "
            f"GitHub Score: {profile_data.get('github_activity_score', 'N/A')}, "
            f"GitHub Languages: {profile_data.get('github_language_diversity', 'N/A')}, "
            f"GitHub Recent Activity: {profile_data.get('github_recent_activity', 'N/A')}, "
            f"LeetCode Rating: {profile_data.get('leetcode_rating', 0)}, "
            f"LeetCode Problems Solved: {profile_data.get('leetcode_problems_solved', 0)}, "
            f"CodeChef Rating: {profile_data.get('codechef_rating', 0)}, "
            f"Coding Score: {profile_data.get('coding_score', 0)}, "
            f"Aptitude Score: {profile_data.get('aptitude_score', 0)}, "
            f"Communication Score: {profile_data.get('communication_score', 0)}, "
            f"Attendance: {profile_data.get('attendance_percentage', 0)}%, "
            f"Certifications: {profile_data.get('certifications_count', 0)}, "
            f"Project Impact: {profile_data.get('project_impact_score', 'N/A')}, "
            f"Certification Impact: {profile_data.get('certification_impact_score', 'N/A')}"
            f"{dsa_str}"
        )

        prompt = (
            "You are an expert career counsellor for engineering students preparing for campus placements.\n"
            "Analyse the following student profile and return EXACTLY 5 actionable improvement suggestions.\n"
            "Each suggestion must be specific and directly tied to the student's weak areas.\n"
            "At least 2 suggestions MUST target weak or not-attempted DSA topics with specific problem types "
            "and recommended practice counts.\n\n"
            f"Student Profile:\n{summary}\n\n"
            "Respond ONLY with a valid JSON array of 5 objects, each having:\n"
            '  "title": short heading (max 8 words),\n'
            '  "detail": 1-2 sentence actionable advice.\n'
            "No markdown, no extra text — just the JSON array."
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        import json
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0].strip()
        suggestions = json.loads(text)
        if isinstance(suggestions, list) and len(suggestions) > 0:
            return suggestions[:5]
        return _generate_fallback_suggestions(profile_data)
    except Exception as e:
        print(f"Gemini suggestion error: {e}")
        return _generate_fallback_suggestions(profile_data)
