"""
Document ORM model with Category, Department, and role-based access array.
Prepared for future pgvector embedding storage.
"""

import enum

from sqlalchemy import ARRAY, Enum, ForeignKey, String, Text, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.user import Department


class DocumentCategory(str, enum.Enum):
    EVENT = "event"
    RESEARCH = "research"
    SYLLABUS = "syllabus"
    NOTES = "notes"
    CIRCULAR = "circular"
    INTERNAL = "internal"


class Document(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=True)

    category: Mapped[str] = mapped_column(
        Enum(DocumentCategory, name="documentcategory", create_constraint=True, native_enum=True),
        nullable=False,
    )
    department: Mapped[str] = mapped_column(
        Enum(Department, name="department", create_constraint=True, native_enum=True),
        nullable=True,  # nullable for public/cross-department docs
    )

    # Roles allowed to view this document (stored as text array in PostgreSQL)
    role_access: Mapped[list] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )

    # Temporary file path (server-local, lost on restart – Feature 1)
    temp_file_path: Mapped[str] = mapped_column(Text, nullable=True)

    # FK to users table (who uploaded)
    uploaded_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # pgvector: uncomment once the extension is enabled:
    # from pgvector.sqlalchemy import Vector
    # embedding: Mapped[list] = mapped_column(Vector(1536), nullable=True)

    uploader = relationship("User", backref="documents", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Document id={self.id} title={self.title!r} cat={self.category} dept={self.department}>"
