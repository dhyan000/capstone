"""
Application configuration – single source of truth.

How it works:
  1. `load_dotenv()` reads .env into `os.environ` so that every module
     (including third-party libraries) can use `os.getenv(...)`.
  2. Pydantic `BaseSettings` then reads the same env vars with type
     validation, defaults, and IDE auto-complete.

Usage:
    from app.core.config import settings
    print(settings.DATABASE_URL)
"""

from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ── Load .env into os.environ FIRST ──────────────────────────────────────────
# This ensures os.getenv("DATABASE_URL") works everywhere, not just via
# the pydantic Settings object.
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path, override=True)


class Settings(BaseSettings):
    """Validated, typed application settings."""

    model_config = SettingsConfigDict(
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # ── Application ─────────────────────────────────────────────────────────
    APP_NAME: str = "Role-Based AI Docs API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"          # development | staging | production

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str                         # REQUIRED – no default → fails fast

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str                           # REQUIRED – no default → fails fast
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v  # kept as str; split at use-time for flexibility

    def get_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # ── AI / Vector Store ─────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    # Comma-separated list of Gemini API keys for automatic failover:
    # GEMINI_API_KEYS=key1,key2,key3
    # Single key also accepted: GEMINI_API_KEYS=key1
    GEMINI_API_KEYS: str = ""          # preferred – multi-key
    GEMINI_API_KEY: str = ""           # legacy fallback (single key)
    GEMINI_MODEL: str = "gemini-2.0-flash"   # Override in .env with GEMINI_MODEL=...
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    VECTOR_DIMENSION: int = 1536

    def get_gemini_keys(self) -> list[str]:
        """
        Return a deduplicated list of Gemini API keys.
        Prefers GEMINI_API_KEYS (comma-separated); falls back to GEMINI_API_KEY.
        """
        raw = self.GEMINI_API_KEYS.strip() or self.GEMINI_API_KEY.strip()
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for k in keys:
            if k not in seen:
                seen.add(k)
                unique.append(k)
        return unique


# ── Singleton ────────────────────────────────────────────────────────────────
# Import `settings` everywhere rather than instantiating repeatedly.
# If DATABASE_URL or SECRET_KEY are missing from both .env and os.environ,
# pydantic will raise a clear ValidationError on import.
settings = Settings()
