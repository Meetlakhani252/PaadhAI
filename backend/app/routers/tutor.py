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
