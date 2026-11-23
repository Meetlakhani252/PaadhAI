-- ==========================================
-- PAADHAI TUTOR MIGRATION (Phase 1)
-- ==========================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents Table (stores uploaded study material)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Chunks Table (stores text chunks and 768-dim embeddings from Gemini)
CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768),
    chunk_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Student Progress Table (tracks topic mastery)
CREATE TABLE IF NOT EXISTS student_progress (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mastery_score INT DEFAULT 0,
    last_revised TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_progress_user_topic UNIQUE (user_id, topic)
);

-- 5. Tutor Messages Table (stores chat history and source citations)
CREATE TABLE IF NOT EXISTS tutor_messages (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    source_chunk_ids INT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_user_id ON tutor_messages(user_id);
