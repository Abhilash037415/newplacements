"""
Resume parsing service.
Extracts text from uploaded PDF resumes and uses Gemini to extract skills.
"""
import os
import re
import json
import PyPDF2
from google import genai
from config import Config


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Common tech skills for fallback extraction
KNOWN_SKILLS = {
    "python", "java", "javascript", "typescript", "c++", "c#", "c", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "sql", "html", "css",
    "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask",
    "spring", "spring boot", "fastapi", ".net", "rails", "laravel",
    "mongodb", "mysql", "postgresql", "redis", "firebase", "dynamodb", "sqlite",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd",
    "git", "github", "linux", "bash", "powershell",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "opencv",
    "machine learning", "deep learning", "nlp", "computer vision", "data science",
    "rest api", "graphql", "microservices", "system design",
    "tailwind", "bootstrap", "sass", "figma",
    "android", "ios", "flutter", "react native",
    "selenium", "jest", "pytest", "junit",
    "agile", "scrum", "jira",
    "blockchain", "solidity", "web3",
}


def extract_text_from_pdf(file_storage) -> str:
    """Extract text from an uploaded PDF file object."""
    try:
        reader = PyPDF2.PdfReader(file_storage)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF text extraction error: {e}")
        return ""


def _extract_with_gemini(resume_text: str) -> dict:
    """Use Gemini to extract skills, projects, and certifications from resume text."""
    if not Config.GEMINI_API_KEY:
        return {}

    try:
        client = genai.Client(api_key=Config.GEMINI_API_KEY)

        prompt = (
            "You are an expert resume parser. Analyse the following resume text VERY carefully and extract "
            "ALL of the following three categories. Do NOT leave any category empty if the resume mentions them.\n\n"
            "1. **skills** – ALL technical skills, programming languages, frameworks, tools, databases, "
            "cloud platforms, and technologies mentioned anywhere in the resume. Properly capitalised "
            "(e.g. 'Python', 'React', 'AWS'). No soft skills. No duplicates.\n\n"
            "2. **projects** – Every project, application, or system the person built or contributed to. "
            "Look for sections titled 'Projects', 'Work', 'Experience', 'Portfolio', or similar. "
            "Also look for bullet points describing things the person built. For each project return:\n"
            '   - "name": project title (if untitled, create a short descriptive name)\n'
            '   - "description": 1-2 sentence summary of what the project does\n'
            '   - "technologies": array of technologies/tools used in this project\n\n'
            "3. **certifications** – Every certification, course, online course, workshop, achievement, "
            "or award mentioned. Look for sections titled 'Certifications', 'Courses', 'Education', "
            "'Achievements', 'Training', etc. For each return:\n"
            '   - "name": certificate/course/achievement title\n'
            '   - "issuer": issuing organisation (e.g. Coursera, Google, AWS, Udemy). Use "" if unknown.\n\n'
            "IMPORTANT: Extract as many items as possible. Even a single mention of a project or certificate counts.\n\n"
            "Return ONLY a valid JSON object with exactly three keys: "
            '"skills" (array of strings), "projects" (array of objects), "certifications" (array of objects).\n'
            "No markdown, no explanation — just the raw JSON object.\n\n"
            f"Resume Text:\n{resume_text[:15000]}"
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        text = response.text.strip()
        print(f"[Resume Parser] Gemini raw response ({len(text)} chars): {text[:300]}...")

        # Robust JSON extraction: try multiple strategies
        result = None

        # Strategy 1: Strip markdown code fences
        cleaned = text
        # Remove ```json ... ``` or ``` ... ``` wrappers
        fence_match = re.search(r'```(?:json)?\s*\n?(.*?)```', cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        # Strategy 2: Try direct parse
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Strategy 3: Find the outermost { ... } in the text
        if result is None:
            brace_match = re.search(r'\{.*\}', text, re.DOTALL)
            if brace_match:
                try:
                    result = json.loads(brace_match.group())
                except json.JSONDecodeError as e:
                    print(f"[Resume Parser] JSON parse failed even after brace extraction: {e}")

        if isinstance(result, dict):
            # Validate structure
            skills = [s for s in result.get("skills", []) if isinstance(s, str) and s.strip()]
            projects = []
            for p in result.get("projects", []):
                if isinstance(p, dict) and p.get("name"):
                    projects.append({
                        "name": str(p.get("name", "")),
                        "description": str(p.get("description", "")),
                        "technologies": [str(t) for t in p.get("technologies", []) if t],
                    })
            certifications = []
            for c in result.get("certifications", []):
                if isinstance(c, dict) and c.get("name"):
                    certifications.append({
                        "name": str(c.get("name", "")),
                        "issuer": str(c.get("issuer", "")),
                    })
            print(f"[Resume Parser] Extracted {len(skills)} skills, {len(projects)} projects, {len(certifications)} certifications")
            return {"skills": skills, "projects": projects, "certifications": certifications}
        print(f"[Resume Parser] Could not parse Gemini response as JSON dict. Type: {type(result)}")
        return {}
    except Exception as e:
        print(f"[Resume Parser] Gemini extraction error: {e}")
        return {}


def _extract_skills_with_gemini(resume_text: str) -> list:
    """Legacy wrapper – extract only skills via Gemini."""
    result = _extract_with_gemini(resume_text)
    return result.get("skills", [])


def _extract_skills_fallback(resume_text: str) -> list:
    """Keyword-based skill extraction as fallback."""
    text_lower = resume_text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        if skill in text_lower:
            # Capitalize properly
            found.append(skill.title() if len(skill) > 3 else skill.upper())
    return sorted(set(found))


def extract_skills_from_resume(file_storage) -> dict:
    """
    Extract text from PDF and identify skills, projects, and certifications.

    Args:
        file_storage: werkzeug FileStorage object from request.files

    Returns:
        dict with keys: success, skills, projects, certifications, resume_text, error
    """
    resume_text = extract_text_from_pdf(file_storage)

    if not resume_text:
        return {
            "success": False,
            "skills": [],
            "projects": [],
            "certifications": [],
            "resume_text": "",
            "error": "Could not extract text from PDF. Make sure it's a valid, text-based PDF.",
        }

    # Try Gemini first for full extraction
    gemini_result = _extract_with_gemini(resume_text)
    skills = gemini_result.get("skills", [])
    projects = gemini_result.get("projects", [])
    certifications = gemini_result.get("certifications", [])

    # Fallback to keyword matching for skills if Gemini didn't return any
    if not skills:
        skills = _extract_skills_fallback(resume_text)

    return {
        "success": True,
        "skills": skills,
        "projects": projects,
        "certifications": certifications,
        "resume_text": resume_text,
        "error": None,
    }
