"""
AI API router – /api/v1/ai

Thin route layer only: inject dependencies, delegate to AIService.
No Gemini logic here.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.ai import AskRequest, AskResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI"])


from app.api.v1.stats import increment_ai_query

@router.post("/ask", response_model=AskResponse)
async def ask_question(
    payload:      AskRequest,
    current_user: User         = Depends(get_current_user),
    db:           AsyncSession = Depends(get_db),
):
    """
    Ask a question and receive an AI-generated answer based on
    documents the current user has access to.
    """
    service = AIService(db)
    
    # Increment global AI query stats
    increment_ai_query(str(current_user.id))
    
    return await service.ask(payload.question, current_user)
