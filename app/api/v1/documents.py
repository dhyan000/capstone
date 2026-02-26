from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models.user import User, UserRole, Department
from app.models.document import DocumentCategory
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])

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
    role_access: list[str] = Form(...),  # Received as list of strings
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new document with optional file upload (staff, hod, admin only)."""
    # Convert role_access strings to UserRole enums
    try:
        roles = [UserRole(r) for r in role_access]
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=f"Invalid role in role_access: {e}")

    payload = DocumentCreate(
        title=title,
        content=content,
        category=category,
        department=department,
        role_access=roles
    )
    
    file_bytes = await file.read() if file else None
    
    service = DocumentService(db)
    return await service.create(
        payload, 
        current_user, 
        file=file_bytes, 
        filename=file.filename if file else None,
        content_type=file.content_type if file else None
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single document (access-filtered)."""
    service = DocumentService(db)
    return await service.get_by_id(document_id, current_user)


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
    """Update a document (owner or admin only)."""
    service = DocumentService(db)
    return await service.update(document_id, payload, current_user)


@router.delete(
    "/{document_id}",
    status_code=204,
    dependencies=[Depends(require_roles([UserRole.STAFF, UserRole.HOD, UserRole.ADMIN]))],
)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document (owner or admin only)."""
    service = DocumentService(db)
    await service.delete(document_id, current_user)
