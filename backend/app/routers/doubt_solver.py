from fastapi import APIRouter, HTTPException
from app.models.schemas import DoubtRequest, DoubtResponse
from app.services.llm_service import get_llm_response

router = APIRouter()

@router.post("/solve", response_model=DoubtResponse)
async def solve_doubt(payload: DoubtRequest):
    try:
        result = await get_llm_response(
            prompt=payload.question_text,
            image_base64=payload.image_base64,
            mime_type=payload.mime_type or "image/jpeg",
            enable_web_search=payload.enable_web_search if payload.enable_web_search is not None else True
        )
        return DoubtResponse(
            answer_text=result["answer_text"],
            sources=result.get("sources", []),
            web_search_queries=result.get("web_search_queries", []),
            web_search_used=result.get("web_search_used", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
