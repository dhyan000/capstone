"""
DocumentService – business logic for document CRUD with access control.
All queries apply build_document_access_filter() before returning results.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import build_document_access_filter
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.document import Document
from app.models.user import User, UserRole
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Create ────────────────────────────────────────────────────────────

    async def create(
        self, 
        payload: DocumentCreate, 
        current_user: User, 
        file: Optional[bytes] = None,
        filename: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> Document:
        content = payload.content
        
        # If a file is provided, try to extract text from it
        if file and filename and content_type:
            from app.core.extractor import TextExtractor
            extracted_text = TextExtractor.extract(file, filename, content_type)
            if extracted_text:
                # Append extracted text to manual content if any, or replace it
                content = f"{content}\n\n[Extracted from {filename}]\n{extracted_text}" if content else extracted_text

        doc = Document(
            title=payload.title,
            content=content,
            category=payload.category.value,
            department=payload.department.value if payload.department else None,
            role_access=[r.value for r in payload.role_access],
            uploaded_by=current_user.id,
        )
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    # ── Read (single) ─────────────────────────────────────────────────────

    async def get_by_id(self, document_id: UUID, current_user: User) -> Document:
        access_filter = build_document_access_filter(current_user)
        stmt = select(Document).where(Document.id == document_id, access_filter)
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundException("Document")
        return doc

    # ── Read (list with access filtering) ─────────────────────────────────

    async def list_filtered(
        self,
        current_user: User,
        category: Optional[str] = None,
        department: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Document]:
        access_filter = build_document_access_filter(current_user)
        stmt = select(Document).where(access_filter)

        # Optional extra filters
        if category:
            stmt = stmt.where(Document.category == category)
        if department:
            stmt = stmt.where(Document.department == department)

        stmt = stmt.order_by(Document.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Update ────────────────────────────────────────────────────────────

    async def update(
        self, document_id: UUID, payload: DocumentUpdate, current_user: User
    ) -> Document:
        doc = await self._get_owned_or_admin(document_id, current_user)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "category" and value is not None:
                value = value.value
            elif field == "department" and value is not None:
                value = value.value
            elif field == "role_access" and value is not None:
                value = [r.value for r in value]
            setattr(doc, field, value)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    # ── Delete ────────────────────────────────────────────────────────────

    async def delete(self, document_id: UUID, current_user: User) -> None:
        doc = await self._get_owned_or_admin(document_id, current_user)
        await self.db.delete(doc)
        await self.db.flush()

    # ── Helpers ───────────────────────────────────────────────────────────

    async def _get_owned_or_admin(self, document_id: UUID, current_user: User) -> Document:
        """Only the uploader or an admin can modify/delete a document."""
        result = await self.db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundException("Document")
        if current_user.role != UserRole.ADMIN.value and doc.uploaded_by != current_user.id:
            raise ForbiddenException("You can only modify your own documents.")
        return doc
