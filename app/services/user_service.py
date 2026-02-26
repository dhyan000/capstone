"""
UserService – business logic for user CRUD and authentication.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, UnauthorizedException
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException("User")
        return user

    async def create(self, payload: UserCreate) -> User:
        if await self.get_by_email(payload.email):
            raise ConflictException("A user with this email already exists.")
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            role=payload.role,
            department=payload.department,
            hashed_password=hash_password(payload.password),
        )
        self.db.add(user)
        await self.db.flush()       # get the auto-generated id before commit
        await self.db.refresh(user)
        return user

    async def update(self, user_id: UUID, payload: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    # ── Auth ──────────────────────────────────────────────────────────────────

    async def authenticate(self, payload: LoginRequest) -> TokenResponse:
        user = await self.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password.")
        if not user.is_active:
            raise UnauthorizedException("Account is inactive.")
        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
