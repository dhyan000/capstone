"""
Pydantic schemas for the AI Q&A endpoint.

This file contains ONLY request/response shapes — no Gemini code,
no database logic, no business logic.
"""

from typing import List

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000, description="User's question")


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: List[str] = Field(default_factory=list, description="Titles of documents used as context")