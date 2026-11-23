from typing import List, Dict, Any
import logging
from app.services.embedding_service import embed_text
from app.database import get_db_pool

logger = logging.getLogger("retrieval_service")

async def retrieve(user_id: str, question: str, k: int = 5) -> List[Dict[str, Any]]:
    """
    Embeds the question and returns the top-k chunks by cosine distance,
    strictly scoped to that user's documents.
    """
    if not question or not question.strip():
        return []

    query_embedding = await embed_text(question.strip())
    vector_str = f"[{','.join(map(str, query_embedding))}]"

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                c.id AS chunk_id,
                c.document_id,
                c.content,
                c.chunk_index,
                d.title AS document_title,
                (c.embedding <=> $1::vector) AS distance
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE d.user_id = $2
            ORDER BY c.embedding <=> $1::vector ASC
            LIMIT $3
            """,
            vector_str,
            user_id,
            k
        )

    return [
        {
            "chunk_id": row["chunk_id"],
            "document_id": row["document_id"],
            "content": row["content"],
            "chunk_index": row["chunk_index"],
            "document_title": row["document_title"],
            "distance": float(row["distance"]) if row["distance"] is not None else None
        }
        for row in rows
    ]
