"""
Async SQLAlchemy engine and session factory.
Provides:
  - `engine`          – shared AsyncEngine instance
  - `AsyncSessionLocal` – session factory (used via dependency)
  - `get_db`          – FastAPI dependency that yields a transactional session
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
# NullPool is recommended for serverless / Render deployments where the process
# may be recycled often and connection leaks are a concern.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,           # SQL logging in debug mode only
    future=True,
    pool_pre_ping=True,            # verify connections before use
    poolclass=NullPool if settings.ENVIRONMENT == "production" else None,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # objects remain usable after commit
    autoflush=False,
    autocommit=False,
)


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, roll back on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Context-manager helper (for scripts / startup tasks) ─────────────────────
@asynccontextmanager
async def db_context() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
