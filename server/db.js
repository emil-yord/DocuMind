const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'documind.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- A "library" is a named collection of documents the user chats against
  CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    char_count INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | failed
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Embeddings stored as JSON arrays of floats. Fine for portfolio-scale
  -- corpora (thousands of chunks); a real production system would use a
  -- dedicated vector index instead of scanning + cosine similarity in JS.
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- user | assistant
    content TEXT NOT NULL,
    citations TEXT, -- JSON array of {documentName, chunkIndex, snippet}
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_documents_library ON documents(library_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_library ON chunks(library_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_library ON conversations(library_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
`);

module.exports = db;
