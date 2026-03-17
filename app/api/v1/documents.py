from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models.user import User, UserRole, Department
from app.models.document import Document, DocumentCategory
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from app.services.document_service import DocumentService
from app.services.ai_service import AIService, _extract_keywords

router = APIRouter(prefix="/documents", tags=["Documents"])


# ── IMPORTANT: /graph must come BEFORE /{document_id} to avoid UUID capture ──

# ── Knowledge Graph (Feature 5) ───────────────────────────────────────────────

@router.get("/graph")
async def get_knowledge_graph(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return a graph of document relationships visible to the current user.

    Nodes  = documents (id + title label)
    Edges  = documents that share ≥ 1 keyword in their titles
    Relation label = 'related {category}' of the target document.

    Uses the existing RBAC filter – the user only ever sees
    documents they are permitted to access.
    """
    from app.core.access import build_document_access_filter

    access_filter = build_document_access_filter(current_user)
    stmt = (
        select(Document)
        .where(access_filter)
        .order_by(Document.created_at.desc())
    )
    result = await db.execute(stmt)
    docs = list(result.scalars().all())

    nodes = [{"id": str(doc.id), "label": doc.title, "category": doc.category} for doc in docs]

    # Build keyword map: doc_id → set of keywords extracted from title
    kw_map: dict[str, set] = {}
    for doc in docs:
        kw_map[str(doc.id)] = set(_extract_keywords(doc.title))

    # Edges: any two docs sharing at least one keyword
    edges = []
    doc_ids = [str(d.id) for d in docs]
    cat_map = {str(d.id): d.category for d in docs}
    for i, src_id in enumerate(doc_ids):
        for tgt_id in doc_ids[i + 1:]:
            shared = kw_map[src_id] & kw_map[tgt_id]
            if shared:
                edges.append({
                    "source":   src_id,
                    "target":   tgt_id,
                    "relation": f"related {cat_map[tgt_id]}",
                })

    return {"nodes": nodes, "edges": edges}


# ── List documents ────────────────────────────────────────────────────────────

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    category: Optional[str] = Query(None, description="Filter by category"),
    department: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List documents visible to the current user (access-filtered)."""
    service = DocumentService(db)
    return await service.list_filtered(
        current_user=current_user,
        category=category,
        department=department,
        limit=limit,
        offset=offset,
    )


# ── Create document ───────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=DocumentResponse,
    status_code=201,
    dependencies=[Depends(require_roles([UserRole.STAFF, UserRole.HOD, UserRole.ADMIN]))],
)
async def create_document(
    title: str = Form(...),
    content: Optional[str] = Form(None),
    category: DocumentCategory = Form(...),
    department: Optional[Department] = Form(None),
    role_access: list[str] = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file to extract its text and store it in the database (staff, hod, admin only).

    - Text is extracted from the file and stored in PostgreSQL for RAG/AI queries.
    - The file is also saved temporarily in temp_uploads/ for soft-copy viewing.
    """
    try:
        roles = [UserRole(r) for r in role_access]
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid role in role_access: {e}")

    payload = DocumentCreate(
        title=title,
        content=content,
        category=category,
        department=department,
        role_access=roles,
    )

    file_bytes = await file.read()

    service = DocumentService(db)
    return await service.create(
        payload,
        current_user,
        file=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )


# ── Get single document ───────────────────────────────────────────────────────

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single document (access-filtered).
    Returns document metadata and extracted text content.
    """
    service = DocumentService(db)
    return await service.get_by_id(document_id, current_user)


# ── Serve temporary file (Feature 1) ──────────────────────────────────────────

@router.get("/{document_id}/file")
async def get_document_file(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Serve the original uploaded file for in-browser viewing.

    - Uses the same RBAC filter as get_document – if the user cannot see
      the document record, they cannot access the file either.
    - If the temp file no longer exists (server restarted / file removed),
      returns a JSON error instead of a 404, so the frontend can show a
      friendly message.
    """
    # Re-use existing RBAC-filtered fetch (raises 404 if user has no access)
    service = DocumentService(db)
    doc = await service.get_by_id(document_id, current_user)

    if doc.temp_file_path and Path(doc.temp_file_path).exists():
        import mimetypes
        file_path = doc.temp_file_path
        media_type, _ = mimetypes.guess_type(file_path)
        
        return FileResponse(
            path=file_path,
            filename=Path(file_path).name,
            media_type=media_type or "application/octet-stream",
            content_disposition_type="inline",
        )

    return JSONResponse(
        status_code=200,
        content={
            "error":   "document_not_available",
            "message": "This document is no longer available as a soft copy.",
        },
    )


# ── Document-specific AI Q&A (Feature 3 + 4) ─────────────────────────────────

class DocAskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)


@router.post("/{document_id}/ask")
async def ask_document(
    document_id: UUID,
    payload: DocAskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a question scoped to one specific document.

    RBAC is checked twice:
      1. The document is fetched WITHOUT the access filter so we can give a
         descriptive RBAC message instead of a plain 404.
      2. AIService._check_document_access() applies the same rules as
         build_document_access_filter() but in-memory, and returns a
         human-readable restriction message if the user is not permitted.

    No document content is ever exposed to an unauthorized user.
    """
    # Fetch by ID only (existence check) – RBAC check is done by AIService
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    from app.api.v1.stats import increment_ai_query
    increment_ai_query(str(current_user.id))

    ai = AIService(db)
    return await ai.ask_about_document(payload.question, doc, current_user)


# ── Update document ───────────────────────────────────────────────────────────

@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
    dependencies=[Depends(require_roles([UserRole.STAFF, UserRole.HOD, UserRole.ADMIN]))],
)
async def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update document metadata (owner or admin only)."""
    service = DocumentService(db)
    return await service.update(document_id, payload, current_user)


# ── Delete document (admin or owner) ─────────────────────────────────────────

@router.delete(
    "/{document_id}",
    status_code=200,
)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document – Admin or the document's uploader only.
    Removes the database record; also cleans up the temp file if it still exists.
    """
    service = DocumentService(db)
    # Fetch first to get temp_file_path before deletion
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if doc and doc.temp_file_path:
        try:
            Path(doc.temp_file_path).unlink(missing_ok=True)
        except Exception:
            pass  # best-effort cleanup
    await service.delete(document_id, current_user)
    return {"message": "Document deleted successfully."}
