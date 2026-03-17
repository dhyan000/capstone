-- reset_documents_table.sql
-- Recreates the documents table without any file storage columns.
-- Only extracted text (content) is stored; files are never saved.
-- WARNING: This will drop the existing table and ALL its data.

-- 1. Drop the existing table safely (cascade handles dependencies)
DROP TABLE IF EXISTS "documents" CASCADE;

-- 2. Drop and recreate enums if needed (uncomment to reset them too)
-- DROP TYPE IF EXISTS documentcategory CASCADE;
-- DROP TYPE IF EXISTS department CASCADE;

-- 3. Recreate the documents table (no file columns)

CREATE TABLE "documents" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    title         VARCHAR(512) NOT NULL,
    content       TEXT,

-- Enums created by SQLAlchemy on first startup
category documentcategory NOT NULL,
department department,

-- Array of allowed role strings
role_access VARCHAR[] NOT NULL DEFAULT '{}',

-- Who uploaded this document
uploaded_by UUID REFERENCES "users"(id) ON DELETE SET NULL );

-- 4. Auto-update updated_at on row changes (optional but recommended)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON "documents";

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON "documents"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: pgvector embedding column is still commented out in the ORM model.
-- To enable it:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE "documents" ADD COLUMN embedding vector(1536);