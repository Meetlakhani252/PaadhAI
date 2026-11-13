import httpx
import logging
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("llm_service")

SYSTEM_INSTRUCTION = """You are an expert academic tutor on StudyStack with real-time web research capabilities.
When a student asks a doubt, shares a question, or requests updated study information:
1. Explain the underlying conceptual foundation clearly and thoroughly.
2. If real-time or contemporary information is requested, synthesize the freshest facts from Google Search.
3. For mathematical, technical, or programming problems, show all intermediate steps and code clearly.
4. Highlight key formulas, definitions, and high-frequency exam principles.
5. Conclude with a concise 'Key Takeaway' summary.
Keep your explanation encouraging, structured, and easy to understand."""

async def get_llm_response(
    prompt: str,
    image_base64: Optional[str] = None,
    mime_type: str = "image/jpeg",
    enable_web_search: bool = True
) -> Dict[str, Any]:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    parts = []
    if image_base64:
        parts.append({
            "inline_data": {
                "mime_type": mime_type,
                "data": image_base64
            }
        })

    parts.append({"text": prompt or "Please explain the concept or solve the question shown in the image."})

    payload: Dict[str, Any] = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        },
        "contents": [
            {"parts": parts}
        ]
    }

    # Enable Google Search grounding for real-time live retrieval
    if enable_web_search:
        payload["tools"] = [{"google_search": {}}]

    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=payload)
        
        # Fallback without search if model variant or region rejects google_search tool
        if response.status_code != 200 and enable_web_search:
            logger.warning(f"Google Search tool returned {response.status_code}, falling back to direct LLM...")
            payload.pop("tools", None)
            response = await client.post(url, json=payload)

        response.raise_for_status()
        data = response.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return {
                "answer_text": "No explanation could be generated.",
                "sources": [],
                "web_search_used": False
            }

        candidate = candidates[0]
        content_parts = candidate.get("content", {}).get("parts", [])
        text_result = "\n".join([p.get("text", "") for p in content_parts if "text" in p]).strip()

        # Extract real-time grounding citations & sources
        sources: List[Dict[str, str]] = []
        grounding_meta = candidate.get("grounding_metadata") or candidate.get("groundingMetadata") or {}
        chunks = grounding_meta.get("grounding_chunks") or grounding_meta.get("groundingChunks") or []

        for chunk in chunks:
            web = chunk.get("web") or {}
            uri = web.get("uri") or web.get("url")
            title = web.get("title") or uri
            if uri and title:
                sources.append({
                    "title": title,
                    "url": uri
                })

        web_search_queries = grounding_meta.get("web_search_queries") or grounding_meta.get("webSearchQueries") or []

        return {
            "answer_text": text_result or "No explanation could be generated.",
            "sources": sources,
            "web_search_queries": web_search_queries,
            "web_search_used": len(sources) > 0 or len(web_search_queries) > 0
        }
