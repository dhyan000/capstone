import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load ENV
from dotenv import load_dotenv
load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding file_name column...")
        try:
            await conn.execute(text("ALTER TABLE documents ADD COLUMN file_name VARCHAR(512);"))
        except Exception as e:
            print(f"Skipped file_name: {e}")

        print("Adding file_path column...")
        try:
            await conn.execute(text("ALTER TABLE documents ADD COLUMN file_path VARCHAR(1024);"))
        except Exception as e:
            print(f"Skipped file_path: {e}")

        print("Adding file_url column...")
        try:
            await conn.execute(text("ALTER TABLE documents ADD COLUMN file_url TEXT;"))
        except Exception as e:
            print(f"Skipped file_url: {e}")
            
    await engine.dispose()
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
