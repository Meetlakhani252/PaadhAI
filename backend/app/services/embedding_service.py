import httpx
import logging
from typing import List
from app.config import settings

logger = logging.getLogger("embedding_service")

# Current official Gemini embedding model in Google Generative Language API
EMBEDDING_MODEL = "gemini-embedding-001"
OUTPUT_DIMENSIONALITY = 768
BATCH_SIZE = 50

async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generates 768-dimensional embeddings for a batch of text chunks using Gemini batchEmbedContents."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    if not texts:
        return []

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:batchEmbedContents?key={api_key}"
    all_embeddings: List[List[float]] = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            payload = {
                "requests": [
                    {
                        "model": f"models/{EMBEDDING_MODEL}",
                        "content": {"parts": [{"text": text}]},
                        "outputDimensionality": OUTPUT_DIMENSIONALITY
                    }
                    for text in batch
                ]
            }

            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings", [])
            for item in embeddings:
                all_embeddings.append(item.get("values", []))

    return all_embeddings

async def embed_text(text: str) -> List[float]:
    """Generates a single 768-dimensional embedding for the given text."""
    embeddings = await generate_embeddings_batch([text])
    if not embeddings:
        raise ValueError("Failed to generate embedding for text.")
    return embeddings[0]
