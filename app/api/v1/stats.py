"""
stats.py – Dashboard stats endpoint (document counts, departments, AI query tracking).
"""

import json
import os
from fastapi import APIRouter, Depends
from sqlalchemy import func, select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["Stats"])

STATS_FILE = "ai_query_stats.json"

def get_ai_query_counts() -> dict:
    if not os.path.exists(STATS_FILE):
        return {}
    try:
        with open(STATS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def increment_ai_query(user_id: str):
    counts = get_ai_query_counts()
    counts[user_id] = counts.get(user_id, 0) + 1
    with open(STATS_FILE, "w") as f:
        json.dump(counts, f)

def get_total_ai_queries() -> int:
    return sum(get_ai_query_counts().values())


@router.get("/dashboard")
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return real counts of all documents and total AI queries."""

    # Total documents across the system
    doc_count_result = await db.execute(
        select(func.count(Document.id))
    )
    doc_count = doc_count_result.scalar() or 0

    # Total departments in the system
    from app.models.user import Department
    dept_count = len(Department)

    # Category breakdown across the system
    cat_result = await db.execute(
        select(Document.category, func.count(Document.id).label("n"))
        .group_by(Document.category)
    )
    categories = {row.category: row.n for row in cat_result}

    # AI queries (persistent counter)
    ai_queries = get_total_ai_queries()

    return {
        "document_count": doc_count,
        "department_count": dept_count,
        "ai_query_count": ai_queries,
        "categories": categories,
    }
