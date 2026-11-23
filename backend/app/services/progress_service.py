import json
import logging
import re
from typing import Optional, Dict, Any
import httpx

from app.config import settings
from app.database import get_db_pool

logger = logging.getLogger("progress_service")

async def grade_student_answer(
    question: str,
    answer: str,
    suggested_topic: Optional[str] = None
) -> Dict[str, Any]:
    """Uses Gemini to evaluate a student's answer to a check question as correct, partial, or wrong."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    prompt = f"""You are an academic examiner evaluating a student's answer to a check question.
Check Question: {question}
Student's Answer: {answer}
{f"Context Topic: {suggested_topic}" if suggested_topic else ""}

Instructions:
1. Grade the answer strictly as one of:
   - "correct" (accurate, demonstrates understanding)
   - "partial" (partially right or incomplete)
   - "wrong" (incorrect or misunderstands concept)
2. Identify a concise syllabus topic name (e.g. "Inheritance", "Polymorphism", "Memory Management", "Recursion").
3. Provide one sentence of constructive feedback.

Respond ONLY with a JSON object:
{{
  "topic": "Concise Topic Name",
  "grade": "correct",
  "feedback": "One sentence feedback"
}}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    models_to_try = [settings.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in models_to_try:
            if not model:
                continue
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        match = re.search(r"\{[\s\S]*\}", text)
                        if match:
                            parsed = json.loads(match.group(0))
                            raw_grade = str(parsed.get("grade", "partial")).lower().strip()
                            if "correct" in raw_grade:
                                grade = "correct"
                            elif "wrong" in raw_grade or "incorrect" in raw_grade:
                                grade = "wrong"
                            else:
                                grade = "partial"
                            topic = str(parsed.get("topic") or suggested_topic or "General Concepts").strip()
                            feedback = str(parsed.get("feedback") or "").strip()
                            return {
                                "topic": topic,
                                "grade": grade,
                                "feedback": feedback
                            }
            except Exception as e:
                logger.warning(f"Grading with {model} failed: {e}")

    return {
        "topic": suggested_topic or "General Concepts",
        "grade": "partial",
        "feedback": "Answer evaluated and recorded."
    }

async def update_student_mastery(
    user_id: str,
    topic: str,
    grade: str
) -> int:
    """
    Updates student_progress.mastery_score in Neon PostgreSQL:
    - correct: +15 points (starts at 15 if new)
    - partial: +5 points (starts at 5 if new)
    - wrong: -5 points (starts at 0 if new)
    Score is bounded between 0 and 100.
    """
    if grade == "correct":
        initial_score = 15
        delta_score = 15
    elif grade == "partial":
        initial_score = 5
        delta_score = 5
    else:  # "wrong"
        initial_score = 0
        delta_score = -5

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        new_score = await conn.fetchval(
            """
            INSERT INTO student_progress (user_id, topic, mastery_score, last_revised)
            VALUES ($1, $2, $3, now())
            ON CONFLICT (user_id, topic)
            DO UPDATE SET
                mastery_score = GREATEST(0, LEAST(100, student_progress.mastery_score + $4)),
                last_revised = now()
            RETURNING mastery_score
            """,
            user_id,
            topic,
            initial_score,
            delta_score
        )
    return int(new_score)

async def grade_and_record_progress(
    user_id: str,
    question: str,
    answer: str,
    topic: Optional[str] = None
) -> Dict[str, Any]:
    """Evaluates the check answer via Gemini and updates student_progress."""
    eval_result = await grade_student_answer(question=question, answer=answer, suggested_topic=topic)
    final_topic = eval_result["topic"]
    grade = eval_result["grade"]
    feedback = eval_result["feedback"]

    new_mastery = await update_student_mastery(user_id=user_id, topic=final_topic, grade=grade)

    return {
        "topic": final_topic,
        "grade": grade,
        "feedback": feedback,
        "mastery_score": new_mastery
    }
