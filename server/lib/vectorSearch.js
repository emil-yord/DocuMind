const db = require('../db');

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds the top-K most relevant chunks in a library for a given query
 * embedding. Scans in JS - simple and transparent, and plenty fast for a
 * portfolio-scale corpus (thousands of chunks). A production system at
 * larger scale would swap this for pgvector, Chroma, or a managed vector DB
 * without changing anything above this function.
 */
function topKChunks(libraryId, queryEmbedding, k = 5) {
  const rows = db
    .prepare(
      `SELECT c.id, c.content, c.chunk_index, c.embedding, c.document_id, d.filename
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.library_id = ?`
    )
    .all(libraryId);

  const scored = rows.map((row) => ({
    id: row.id,
    content: row.content,
    chunkIndex: row.chunk_index,
    documentId: row.document_id,
    filename: row.filename,
    score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding))
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

module.exports = { cosineSimilarity, topKChunks };
