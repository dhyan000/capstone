"""
Script to drop and recreate all database tables.
WARNING: This will delete all existing data.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database.session import engine
from app.database.base import Base
# Import models to ensure they are registered with Base.metadata
import app.models.user
import app.models.document

async def reset_db():
    print("⏳ Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    print("⏳ Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database reset complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_db())
