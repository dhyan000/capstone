"""
Shared FastAPI dependencies – authentication and role authorization.
"""

from typing import Sequence
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.database.session import get_db
from app.models.user import User, UserRole


async def get_current_user(
    authorization: str = Header(..., description="Bearer <token>"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract the JWT from the Authorization header, decode it,
    and return the corresponding active User.
    """
    # Expect "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthorizedException("Invalid Authorization header format. Use: Bearer <token>")

    token = parts[1]
    payload = decode_token(token)  # raises UnauthorizedException on failure

    user_id_str: str = payload.get("sub")
    token_type: str = payload.get("type")

    if not user_id_str or token_type != "access":
        raise UnauthorizedException("Invalid or expired token.")

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid token subject.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User not found.")
    if not user.is_active:
        raise UnauthorizedException("Account is inactive.")

    return user


def require_roles(allowed_roles: Sequence[UserRole]):
    """
    Dependency factory – returns a dependency that checks whether
    the current user's role is in the allowed list.

    Usage:
        @router.post("/", dependencies=[Depends(require_roles([UserRole.STAFF, UserRole.HOD, UserRole.ADMIN]))])
    """

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in [r.value for r in allowed_roles]:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized. Required: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return _check
