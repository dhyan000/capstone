"""
Pydantic schemas for Document – request / response shapes.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.document import DocumentCategory
from app.models.user import Department, UserRole


# ── Request schemas ───────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(..., max_length=512)
    content: Optional[str] = None
    category: DocumentCategory
    department: Optional[Department] = None
    role_access: List[UserRole] = Field(
        default_factory=lambda: [UserRole.STUDENT, UserRole.STAFF, UserRole.HOD, UserRole.ADMIN],
        description="List of roles that can view this document",
    )


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=512)
    content: Optional[str] = None
    category: Optional[DocumentCategory] = None
    department: Optional[Department] = None
    role_access: Optional[List[UserRole]] = None


# ── Response schemas ──────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: Optional[str]
    category: DocumentCategory
    department: Optional[Department]
    role_access: List[str]
    uploaded_by: Optional[uuid.UUID]
    temp_file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
