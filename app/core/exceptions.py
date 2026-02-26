from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception."""

    def __init__(self, status_code: int, detail: str, error_code: str = "APP_ERROR"):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=404,
            detail=f"{resource} not found.",
            error_code="NOT_FOUND",
        )


class ForbiddenException(AppException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(status_code=403, detail=detail, error_code="FORBIDDEN")


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Could not validate credentials."):
        super().__init__(status_code=401, detail=detail, error_code="UNAUTHORIZED")


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists."):
        super().__init__(status_code=409, detail=detail, error_code="CONFLICT")


# ── Global exception handlers (register in main.py) ──────────────────────────

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "detail": exc.detail,
            "path": str(request.url),
        },
        headers={"Access-Control-Allow-Origin": "http://localhost:5173"},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP_ERROR",
            "detail": exc.detail,
            "path": str(request.url),
        },
        headers={"Access-Control-Allow-Origin": "http://localhost:5173"},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import traceback
    from app.core.config import settings
    debug = settings.DEBUG
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "detail": f"{type(exc).__name__}: {exc}" if debug else "An unexpected error occurred. Please try again later.",
            "traceback": traceback.format_exc() if debug else None,
            "path": str(request.url),
        },
        headers={"Access-Control-Allow-Origin": "http://localhost:5173"},
    )
