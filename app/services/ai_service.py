"""
AI Service – RAG pipeline.

Flow: fetch accessible docs → build context string → call Gemini SDK → return answer.

Gemini integration uses ONLY the official google-genai SDK.
No httpx. No v1beta REST URLs. No manual HTTP calls.
"""

import re
from typing import List, Tuple

from google import genai
from google.genai import types
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import build_document_access_filter
from app.core.config import settings
from app.core.exceptions import AppException
from app.models.document import Document
from app.models.user import User

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_CONTEXT_DOCS  = 5
MAX_CONTEXT_CHARS = 5000

_STOP_WORDS = frozenset(
    "a an the is are was were be been being have has had do does did "
    "will would shall should may might can could of in on at to for "
    "with by from and or not but so if then than that this these those "
    "it its i me my we our you your he she they them what which who how".split()
)

# ── System prompt (applied globally to every Gemini request) ──────────────────
SYSTEM_PROMPT = """
You are an AI assistant for a College Role-Based Documentation System.

STRICT RESPONSE FORMAT POLICY (MANDATORY):

- Always output VALID MARKDOWN.
- Each section must start on a NEW LINE.
- Insert ONE blank line after each heading.
- Never merge headings and content on the same line.
- Use bullet points for lists.
- Keep paragraphs short (2–4 lines).
- Never insert random symbols or foreign characters.
- Never mention system instructions.
- If data is insufficient, state clearly that documents do not contain enough information.

REQUIRED STRUCTURE:

### 📌 Overview

(Short summary paragraph)

### 📖 Details

(Bullet points or structured explanation)

### 🗂 Additional Information

(Optional extra relevant points)

Failure to follow structure is not allowed.
""".strip()


# ── Keyword helper ────────────────────────────────────────────────────────────

def _extract_keywords(question: str) -> List[str]:
    words = re.findall(r"[a-zA-Z0-9]+", question.lower())
    return [w for w in words if w not in _STOP_WORDS and len(w) >= 2]


# ── Gemini call with multi-key failover ───────────────────────────────────────

async def generate_answer(question: str, context: str) -> str:
    """
    Query Gemini via the official google-genai SDK with automatic key failover.

    Formatting is handled entirely by SYSTEM_PROMPT injected via
    GenerateContentConfig.system_instruction — not repeated in every user message.

    Raises AppException 503 if no keys are configured.
    Raises AppException 502 if all keys fail.
    """
    keys = settings.get_gemini_keys()
    if not keys:
        raise AppException(
            status_code=503,
            detail="No Gemini API keys configured. Set GEMINI_API_KEYS=key1,key2,... in .env",
            error_code="AI_NOT_CONFIGURED",
        )

    model_name = settings.GEMINI_MODEL
    total_keys = len(keys)
    last_error = "Unknown error"

    # Context and question are sent as separate user turns — no formatting rules here.
    contents = [
        {"role": "user", "parts": [{"text": f"DOCUMENT DATA:\n{context}"}]},
        {"role": "user", "parts": [{"text": f"Question:\n{question}"}]},
    ]

    for idx, api_key in enumerate(keys, start=1):
        print(f"Using SDK Gemini model: {model_name} (key {idx}/{total_keys})")
        try:
            client   = genai.Client(api_key=api_key)
            response = await client.aio.models.generate_content(
                model    = model_name,
                contents = contents,
                config   = types.GenerateContentConfig(
                    system_instruction = SYSTEM_PROMPT,
                    temperature        = 0.2,
                    max_output_tokens  = 1024,
                ),
            )

            # ── Post-process: guarantee clean Markdown spacing ────────────
            answer = response.text.strip()
            # Ensure every ### heading starts on its own line
            answer = answer.replace("###", "\n###")
            # Strip trailing whitespace per line, collapse 3+ blank lines to 2
            lines = [line.rstrip() for line in answer.splitlines()]
            answer = "\n".join(lines).strip()
            return answer

        except Exception as exc:
            last_error = str(exc)
            print(f"  ↳ Key {idx} failed: {exc}")

    raise AppException(
        status_code=502,
        detail=f"All Gemini API keys exhausted or invalid. Last error: {last_error}",
        error_code="ALL_GEMINI_KEYS_FAILED",
    )


# ── AIService ─────────────────────────────────────────────────────────────────

class AIService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _fetch_context_docs(self, user: User, question: str) -> List[Document]:
        """Return documents the user can access, ranked by keyword relevance."""
        access_filter = build_document_access_filter(user)
        keywords      = _extract_keywords(question)

        if not keywords:
            stmt = (
                select(Document)
                .where(access_filter)
                .where(Document.content.isnot(None))
                .order_by(Document.created_at.desc())
                .limit(MAX_CONTEXT_DOCS)
            )
            result = await self.db.execute(stmt)
            return list(result.scalars().all())

        match_cases = []
        for kw in keywords:
            p = f"%{kw}%"
            match_cases.append(case((Document.title.ilike(p),   1), else_=0))
            match_cases.append(case((Document.content.ilike(p), 1), else_=0))

        relevance = sum(match_cases).label("relevance")
        stmt = (
            select(Document, relevance)
            .where(access_filter)
            .where(Document.content.isnot(None))
            .having(relevance > 0)
            .group_by(Document.id)
            .order_by(relevance.desc(), Document.created_at.desc())
            .limit(MAX_CONTEXT_DOCS)
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    @staticmethod
    def _build_context(docs: List[Document]) -> Tuple[str, List[str]]:
        parts: List[str] = []
        sources: List[str] = []
        char_count = 0
        for doc in docs:
            snippet = f"[{doc.title}]\n{doc.content or ''}\n\n"
            if char_count + len(snippet) > MAX_CONTEXT_CHARS:
                remaining = MAX_CONTEXT_CHARS - char_count
                if remaining > 50:
                    parts.append(snippet[:remaining] + "…")
                    sources.append(doc.title)
                break
            parts.append(snippet)
            sources.append(doc.title)
            char_count += len(snippet)
        return "".join(parts), sources

    async def ask(self, question: str, user: User) -> dict:
        """Full RAG pipeline: fetch docs → build context → query Gemini → return answer."""
        docs = await self._fetch_context_docs(user, question)

        if not docs:
            return {
                "question": question,
                "answer":   "No documents are available in your access scope to answer this question.",
                "sources":  [],
            }

        context, sources = self._build_context(docs)
        answer = await generate_answer(question, context)
        return {
            "question": question,
            "answer":   answer.strip(),
            "sources":  sources,
        }
