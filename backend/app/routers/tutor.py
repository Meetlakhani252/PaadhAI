from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.services.pdf_parser import PDFParser
from app.services.embedding_service import generate_embeddings_batch
from app.services.retrieval_service import retrieve
from app.services.tutor_service import stream_tutor_response
from app.services.progress_service import grade_and_record_progress
from app.utils.auth import get_authenticated_user_id
from app.utils.rate_limiter import check_tutor_rate_limit
from app.database import get_db_pool

logger = logging.getLogger("tutor_router")
router = APIRouter()

class TutorChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Student's question or message")
    k: int = Field(5, ge=1, le=20, description="Number of context chunks to retrieve")

class GradeAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The check question that was asked")
    answer: str = Field(..., min_length=1, description="The student's answer")
    topic: Optional[str] = Field(None, description="Optional topic name")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into chunks of approximately 500 tokens (words) with 50 tokens overlap."""
    words = text.split()
    if not words:
        return []
    chunks = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end >= len(words):
            break
        start += step
    return chunks

@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    user_id: str = Depends(get_authenticated_user_id)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty."
        )

    try:
        parser = PDFParser()
        raw_text = parser.parse_pdf_bytes(pdf_bytes)
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read PDF: {str(e)}"
        )

    if not raw_text or not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF contains no extractable text. Scanned or image-only PDFs are not supported."
        )

    # Split into chunks of ~500 tokens with 50 overlap
    chunks = chunk_text(raw_text.strip(), chunk_size=500, overlap=50)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text chunks from the document."
        )

    # Generate 768-dim embeddings in batch
    try:
        embeddings = await generate_embeddings_batch(chunks)
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )

    doc_title = title.strip() if title and title.strip() else file.filename

    # Store document and chunks in Neon PostgreSQL
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            doc_id = await conn.fetchval(
                """
                INSERT INTO documents (user_id, title, source_type)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                user_id,
                doc_title,
                "pdf"
            )

            # Insert chunks with pgvector embeddings
            chunk_records = [
                (
                    doc_id,
                    chunk,
                    f"[{','.join(map(str, emb))}]",
                    idx
                )
                for idx, (chunk, emb) in enumerate(zip(chunks, embeddings))
            ]

            await conn.executemany(
                """
                INSERT INTO chunks (document_id, content, embedding, chunk_index)
                VALUES ($1, $2, $3::vector, $4)
                """,
                chunk_records
            )

    return {
        "document_id": doc_id,
        "chunk_count": len(chunks)
    }

@router.post("/chat")
async def tutor_chat(
    payload: TutorChatRequest,
    user_id: str = Depends(get_authenticated_user_id)
):
    # Enforce per-user rate limit (configurable via TUTOR_RATE_LIMIT_PER_HOUR)
    check_tutor_rate_limit(user_id)

    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    return StreamingResponse(
        stream_tutor_response(user_id=user_id, question=payload.message.strip(), k=payload.k),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/grade")
async def grade_check_question(
    payload: GradeAnswerRequest,
    user_id: str = Depends(get_authenticated_user_id)
):
    """Grades a student's answer to a check question and updates student_progress.mastery_score."""
    check_tutor_rate_limit(user_id)
    result = await grade_and_record_progress(
        user_id=user_id,
        question=payload.question.strip(),
        answer=payload.answer.strip(),
        topic=payload.topic.strip() if payload.topic else None
    )
    return result

@router.get("/history")
async def get_tutor_history(user_id: str = Depends(get_authenticated_user_id)):
    """Returns the user's last 50 messages from tutor_messages, oldest first."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, role, content, source_chunk_ids, created_at
            FROM (
                SELECT id, role, content, source_chunk_ids, created_at
                FROM tutor_messages
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 50
            ) sub
            ORDER BY created_at ASC
            """,
            user_id
        )
    return [
        {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "source_chunk_ids": r["source_chunk_ids"] or [],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        }
        for r in rows
    ]

@router.delete("/history")
async def clear_tutor_history(user_id: str = Depends(get_authenticated_user_id)):
    """Clears the user's chat history."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM tutor_messages WHERE user_id = $1", user_id)
    return {"status": "cleared", "message": "Chat history cleared successfully"}

@router.get("/documents")
async def get_user_documents(user_id: str = Depends(get_authenticated_user_id)):
    """Returns the user's uploaded documents with chunk count."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                d.id,
                d.title,
                d.created_at,
                COUNT(c.id)::int AS chunk_count
            FROM documents d
            LEFT JOIN chunks c ON c.document_id = d.id
            WHERE d.user_id = $1
            GROUP BY d.id, d.title, d.created_at
            ORDER BY d.created_at DESC
            """,
            user_id
        )
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "chunk_count": r["chunk_count"]
        }
        for r in rows
    ]

@router.delete("/documents/{document_id}")
async def delete_user_document(document_id: int, user_id: str = Depends(get_authenticated_user_id)):
    """Deletes a document and its cascaded chunks, only if it belongs to the user."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        deleted_id = await conn.fetchval(
            "DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id",
            document_id,
            user_id
        )
    if not deleted_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or unauthorized"
        )
    return {"status": "deleted", "document_id": document_id}

@router.get("/progress")
async def get_student_progress(user_id: str = Depends(get_authenticated_user_id)):
    """Returns student_progress rows for the user, sorted by lowest mastery first."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT topic, mastery_score, last_revised
            FROM student_progress
            WHERE user_id = $1
            ORDER BY mastery_score ASC, last_revised DESC
            """,
            user_id
        )
    return [
        {
            "topic": r["topic"],
            "mastery_score": r["mastery_score"],
            "last_revised": r["last_revised"].isoformat() if r["last_revised"] else None
        }
        for r in rows
    ]
