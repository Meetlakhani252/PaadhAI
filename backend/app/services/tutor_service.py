import json
import httpx
import logging
from typing import AsyncGenerator, List, Dict, Any
from app.config import settings
from app.services.retrieval_service import retrieve
from app.services.progress_service import grade_and_record_progress
from app.database import get_db_pool

logger = logging.getLogger("tutor_service")

GENERATE_KEYWORDS = (
    "question bank",
    "questions",
    "quiz",
    "mcq",
    "flashcards",
    "summary",
    "summarize",
    "revision notes",
    "practice",
)

ANSWER_SYSTEM_PROMPT = (
    "You are PaadhAI Tutor. "
    "Answer ONLY using the provided context chunks. "
    "If the answer is not in the context, say 'This isn't in your study material' "
    "and give a short hint labelled 'General hint'. "
    "Ask exactly ONE short check question only after explaining a concept. "
    "Never ask a check question after syllabus logistics "
    "(hours, marks, weeks, which unit covers what). "
    "Never invent facts, formulas or citations."
)

GENERATE_SYSTEM_PROMPT = (
    "You are PaadhAI Tutor. Using the study material context below, generate exactly what the student "
    "requests (question bank, quiz, summary, flashcards). Base every question on topics found in the context. "
    "Do not refuse. If some units are missing from the context, generate for the units you can see and list "
    "which units were not covered so the student can ask for them separately. Do not ask a check question."
)


def is_generate_mode(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in GENERATE_KEYWORDS)

async def save_tutor_messages(user_id: str, question: str, answer: str, source_chunk_ids: List[int]):
    """Saves both user query and tutor answer into tutor_messages table."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Save student's question
                await conn.execute(
                    """
                    INSERT INTO tutor_messages (user_id, role, content, source_chunk_ids)
                    VALUES ($1, 'user', $2, $3)
                    """,
                    user_id,
                    question,
                    source_chunk_ids
                )
                # Save tutor's response
                await conn.execute(
                    """
                    INSERT INTO tutor_messages (user_id, role, content, source_chunk_ids)
                    VALUES ($1, 'assistant', $2, $3)
                    """,
                    user_id,
                    answer,
                    source_chunk_ids
                )
        logger.info(f"Saved tutor conversation for user {user_id} with {len(source_chunk_ids)} source chunk IDs")
    except Exception as e:
        logger.error(f"Failed to save tutor messages: {e}")

async def stream_tutor_response(
    user_id: str,
    question: str,
    k: int = 5
) -> AsyncGenerator[str, None]:
    """Retrieves top-k chunks, generates a streaming response with Gemini Flash, and saves conversation."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'detail': 'Gemini API key is not configured.'})}\n\n"
        return

    generate_mode = is_generate_mode(question)
    retrieval_k = 15 if generate_mode else k
    system_prompt = GENERATE_SYSTEM_PROMPT if generate_mode else ANSWER_SYSTEM_PROMPT

    # 1. Retrieve top-k chunks
    chunks = await retrieve(user_id=user_id, question=question, k=retrieval_k)
    source_chunk_ids = [c["chunk_id"] for c in chunks]
    sources = [
        {
            "chunk_id": c["chunk_id"],
            "document_id": c["document_id"],
            "document_title": c["document_title"],
            "distance": c["distance"]
        }
        for c in chunks
    ]

    # Emit initial metadata with source chunk IDs
    yield f"data: {json.dumps({'type': 'metadata', 'source_chunk_ids': source_chunk_ids, 'sources': sources})}\n\n"

    # Evaluate whether the student is answering the previous check question (ANSWER mode only)
    if not generate_mode:
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                last_assistant_msg = await conn.fetchval(
                    """
                    SELECT content FROM tutor_messages 
                    WHERE user_id = $1 AND role = 'assistant' 
                    ORDER BY id DESC LIMIT 1
                    """,
                    user_id
                )
            if last_assistant_msg and ("?" in last_assistant_msg or "question" in last_assistant_msg.lower()):
                eval_result = await grade_and_record_progress(
                    user_id=user_id,
                    question=last_assistant_msg,
                    answer=question,
                    topic=chunks[0]["document_title"].replace(".pdf", "") if chunks else None
                )
                yield f"data: {json.dumps({'type': 'progress', **eval_result})}\n\n"
        except Exception as eval_err:
            logger.warning(f"Check question evaluation skipped: {eval_err}")

    # 2. Build prompt with context
    if chunks:
        context_parts = []
        for c in chunks:
            context_parts.append(f"[Chunk ID: {c['chunk_id']} | Source: {c['document_title']}]\n{c['content']}")
        context_text = "\n\n".join(context_parts)
    else:
        context_text = "No study material found for this user."

    user_prompt = f"Study Material Context:\n---\n{context_text}\n---\n\nStudent Question: {question}"

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "maxOutputTokens": 2048
        }
    }

    # 3. Stream from Gemini Flash (with model fallback)
    models_to_try = [settings.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest"]
    full_answer_parts = []
    stream_opened = False

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models_to_try:
            if not model:
                continue
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}"
            try:
                async with client.stream("POST", url, json=payload) as resp:
                    if resp.status_code == 200:
                        stream_opened = True
                        async for line in resp.aiter_lines():
                            line = line.strip()
                            if line.startswith("data: "):
                                raw_json = line[6:].strip()
                                if raw_json == "[DONE]":
                                    continue
                                try:
                                    data = json.loads(raw_json)
                                    candidates = data.get("candidates", [])
                                    if candidates:
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        text_delta = "".join([p.get("text", "") for p in parts if "text" in p])
                                        if text_delta:
                                            full_answer_parts.append(text_delta)
                                            yield f"data: {json.dumps({'type': 'delta', 'text': text_delta})}\n\n"
                                except Exception:
                                    pass
                        break
                    else:
                        logger.warning(f"Model {model} returned status {resp.status_code}, trying fallback...")
            except Exception as e:
                logger.warning(f"Error streaming from {model}: {e}")

    if not stream_opened:
        yield f"data: {json.dumps({'type': 'error', 'detail': 'Unable to connect to AI tutor. Please try again.'})}\n\n"
        return

    full_answer = "".join(full_answer_parts).strip()

    # 4. Save both messages to tutor_messages
    await save_tutor_messages(user_id, question, full_answer, source_chunk_ids)

    # 5. Emit completion event
    yield f"data: {json.dumps({'type': 'done', 'source_chunk_ids': source_chunk_ids})}\n\n"
    yield "data: [DONE]\n\n"
