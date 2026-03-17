import asyncio
import asyncpg

DB_URL = "postgresql://postgres.quwfxpymtpjblibcubsg:Sakunthala%4055@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

async def run():
    print("Connecting to Supabase…")
    conn = await asyncpg.connect(DB_URL)
    try:
        await conn.execute(
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS temp_file_path TEXT;"
        )
        row = await conn.fetchrow(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = 'documents' AND column_name = 'temp_file_path';"
        )
        if row:
            print(f"SUCCESS: column '{row['column_name']}' ({row['data_type']}) is live.")
        else:
            print("ERROR: column not found after ALTER — check DB permissions.")
    finally:
        await conn.close()

asyncio.run(run())
