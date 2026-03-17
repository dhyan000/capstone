"""
DocumentService – business logic for document CRUD with access control.
All queries apply build_document_access_filter() before returning results.

Text extraction is preserved for RAG/AI pipeline (stored in Document.content).
No file storage – only extracted text is saved to the database.
"""

from typing import List, Optional
from uuid import UUID, uuid4
from pathlib import Path

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
        content_type: Optional[str] = None,
    ) -> Document:
        """
        Extract text from the uploaded file bytes and save only the text to the DB.
        No file is stored anywhere – binary data is discarded after extraction.
        """
        content = payload.content

        # ── Temp file storage (Feature 1) ──────────────────────────────
        temp_file_path = None
        if file and filename:
            safe_name = Path(filename).name  # strip any path traversal
            temp_path = Path("temp_uploads") / f"{uuid4()}_{safe_name}"
            try:
                temp_path.write_bytes(file)
                temp_file_path = str(temp_path)
            except Exception as e:
                print(f"Warning: could not write temp file: {e}")

        # ── Extract text for RAG pipeline ─────────────────────────────
        if file and filename:
            from app.core.extractor import TextExtractor
            extracted_text = TextExtractor.extract(file, filename, content_type or "")
            if extracted_text:
                content = (
                    f"{content}\n\n[Extracted from {filename}]\n{extracted_text}"
                    if content
                    else extracted_text
                )

        doc = Document(
            title=payload.title,
            content=content,
            category=payload.category.value,
            department=payload.department.value if payload.department else None,
            role_access=[r.value for r in payload.role_access],
            uploaded_by=current_user.id,
            temp_file_path=temp_file_path,
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

        if category:
            categories = [c.strip() for c in category.split(",") if c.strip()]
            if categories:
                stmt = stmt.where(Document.category.in_(categories))
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

    # ── Delete (admin or owner) ───────────────────────────────────────────

    async def delete(self, document_id: UUID, current_user: User) -> None:
        """
        Deletes a document DB record.
        Allowed for: Admin or the document's uploader.
        No storage cleanup needed – files were never stored.
        """
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
