const express = require('express');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const pdfParse = require('pdf-parse');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { chunkText } = require('../lib/chunker');
const { embedTexts } = require('../lib/embeddings');

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB per file
});

function isOwner(libraryId, userId) {
  return !!db
    .prepare('SELECT 1 FROM libraries WHERE id = ? AND user_id = ?')
    .get(libraryId, userId);
}

// ---- Libraries ----

router.get('/', (req, res) => {
  const libraries = db
    .prepare('SELECT * FROM libraries WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId);
  res.json({ libraries });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Library name is required' });
  }
  const id = uuid();
  db.prepare('INSERT INTO libraries (id, user_id, name) VALUES (?, ?, ?)').run(
    id,
    req.userId,
    name.trim()
  );
  res.status(201).json({ library: db.prepare('SELECT * FROM libraries WHERE id = ?').get(id) });
});

router.get('/:libraryId', (req, res) => {
  const { libraryId } = req.params;
  if (!isOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(libraryId);
  const documents = db
    .prepare('SELECT * FROM documents WHERE library_id = ? ORDER BY created_at DESC')
    .all(libraryId);
  res.json({ library, documents });
});

router.delete('/:libraryId', (req, res) => {
  const { libraryId } = req.params;
  if (!isOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  db.prepare('DELETE FROM libraries WHERE id = ?').run(libraryId);
  res.status(204).end();
});

// ---- Documents ----

async function extractText(file) {
  const isPdf =
    file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text;
  }
  // Treat everything else as plain text (.txt, .md, etc.)
  return file.buffer.toString('utf-8');
}

router.post('/:libraryId/documents', upload.single('file'), async (req, res) => {
  const { libraryId } = req.params;
  if (!isOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const documentId = uuid();
  db.prepare(
    `INSERT INTO documents (id, library_id, filename, status) VALUES (?, ?, ?, 'processing')`
  ).run(documentId, libraryId, req.file.originalname);

  try {
    const text = await extractText(req.file);
    if (!text || !text.trim()) {
      throw new Error('No extractable text found in this file');
    }

    const pieces = chunkText(text);
    if (pieces.length === 0) {
      throw new Error('Document produced no chunks after processing');
    }

    // Embed in batches so a single Voyage request never gets too large
    const BATCH_SIZE = 32;
    const embeddings = [];
    for (let i = 0; i < pieces.length; i += BATCH_SIZE) {
      const batch = pieces.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await embedTexts(batch, 'document');
      embeddings.push(...batchEmbeddings);
    }

    const insertChunk = db.prepare(
      'INSERT INTO chunks (id, document_id, library_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const tx = db.transaction(() => {
      pieces.forEach((content, i) => {
        insertChunk.run(uuid(), documentId, libraryId, i, content, JSON.stringify(embeddings[i]));
      });
      db.prepare(
        `UPDATE documents SET status = 'ready', char_count = ?, chunk_count = ? WHERE id = ?`
      ).run(text.length, pieces.length, documentId);
    });
    tx();

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    res.status(201).json({ document });
  } catch (err) {
    db.prepare(`UPDATE documents SET status = 'failed', error = ? WHERE id = ?`).run(
      err.message,
      documentId
    );
    res.status(500).json({ error: `Failed to process document: ${err.message}` });
  }
});

router.delete('/:libraryId/documents/:documentId', (req, res) => {
  const { libraryId, documentId } = req.params;
  if (!isOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  db.prepare('DELETE FROM documents WHERE id = ? AND library_id = ?').run(documentId, libraryId);
  res.status(204).end();
});

module.exports = router;
