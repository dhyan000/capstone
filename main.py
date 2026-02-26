"""
main.py – Application entry point for the Role-Based AI Documentation System.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.database.session import engine
from app.database.base import Base

# Import all models so Base.metadata knows about them
import app.models.user      # noqa: F401
import app.models.document  # noqa: F401


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup – auto-create tables (safe for dev; use Alembic in production)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅  Database tables verified / created.")
    except Exception as e:
        print(f"⚠️  Could not connect to database at startup: {e}")
        print("    The server will start, but DB operations will fail until the connection is fixed.")
    print(f"🚀  Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    # Shutdown
    await engine.dispose()
    print("🛑  Database connections closed.")


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Role-Based AI Documentation System API. "
            "Provides document management, role-based access control, "
            "and AI-assisted documentation features."
        ),
        docs_url="/docs" if settings.DEBUG else None,   # hide Swagger in prod
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Exception handlers ────────────────────────────────────────────────────
    app.add_exception_handler(AppException, app_exception_handler)          # type: ignore[arg-type]
    app.add_exception_handler(HTTPException, http_exception_handler)        # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)       # type: ignore[arg-type]

    # ── CORS (added AFTER exception handlers so it wraps ALL responses) ───
    origins = settings.get_allowed_origins()
    if "http://localhost:5173" not in origins:
        origins.append("http://localhost:5173")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(api_v1_router)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], summary="Health check")
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": settings.APP_VERSION})

    return app


app = create_app()


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug" if settings.DEBUG else "info",
    )
