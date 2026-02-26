"""
Centralized document access control.

build_document_access_filter(user) → returns a SQLAlchemy where-clause
that restricts the documents a given user can see.

Rules:
  admin   → no filter (full access)
  hod     → own department + research globally; role must be in role_access
  staff   → own department + research globally; role must be in role_access
  student → own department + research globally (all depts); role must be in role_access
  guest   → only event & circular; role must be in role_access
"""

from sqlalchemy import and_, or_, true

from app.models.document import Document, DocumentCategory
from app.models.user import User, UserRole


def build_document_access_filter(user: User):
    """
    Return a SQLAlchemy filter expression for Document queries
    that enforces the multi-dimensional access rules.
    """

    # ── Admin bypass ──────────────────────────────────────────────────────
    if user.role == UserRole.ADMIN.value:
        return true()  # no restriction

    # ── Base: user's role must be listed in the document's role_access ────
    role_filter = Document.role_access.any(user.role)

    # ── Guest: only event + circular, no department restriction ───────────
    if user.role == UserRole.GUEST.value:
        category_filter = Document.category.in_([
            DocumentCategory.EVENT.value,
            DocumentCategory.CIRCULAR.value,
        ])
        return and_(role_filter, category_filter)

    # ── Student / Staff / HOD ─────────────────────────────────────────────
    # Research papers → accessible across ALL departments (no dept filter)
    # Everything else → restricted to user's own department

    is_research = Document.category == DocumentCategory.RESEARCH.value

    own_dept = or_(
        Document.department == user.department,  # same department
        Document.department.is_(None),            # or public doc
    )

    combined = or_(
        is_research,   # research → global access
        own_dept,      # other categories → own department only
    )

    return and_(role_filter, combined)
