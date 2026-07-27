const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { embedQuery } = require('../lib/embeddings');
const { topKChunks } = require('../lib/vectorSearch');
const { streamLLM } = require('../lib/llm');

const router = express.Router();
router.use(requireAuth);

function getConversationWithLibrary(conversationId) {
  return db
    .prepare(
      `SELECT c.*, l.user_id as library_owner_id FROM conversations c
       JOIN libraries l ON l.id = c.library_id WHERE c.id = ?`
    )
    .get(conversationId);
}

function isLibraryOwner(libraryId, userId) {
  return !!db
    .prepare('SELECT 1 FROM libraries WHERE id = ? AND user_id = ?')
    .get(libraryId, userId);
}

// ---- Conversations ----

router.get('/libraries/:libraryId/conversations', (req, res) => {
  const { libraryId } = req.params;
  if (!isLibraryOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  const conversations = db
    .prepare('SELECT * FROM conversations WHERE library_id = ? ORDER BY created_at DESC')
    .all(libraryId);
  res.json({ conversations });
});

router.post('/libraries/:libraryId/conversations', (req, res) => {
  const { libraryId } = req.params;
  if (!isLibraryOwner(libraryId, req.userId)) {
    return res.status(403).json({ error: 'You do not have access to this library' });
  }
  const id = uuid();
  db.prepare('INSERT INTO conversations (id, library_id, user_id) VALUES (?, ?, ?)').run(
    id,
    libraryId,
    req.userId
  );
  res.status(201).json({
    conversation: db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)
  });
});

router.get('/conversations/:conversationId/messages', (req, res) => {
  const { conversationId } = req.params;
  const convo = getConversationWithLibrary(conversationId);
  if (!convo || convo.library_owner_id !== req.userId) {
    return res.status(403).json({ error: 'You do not have access to this conversation' });
  }
  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId)
    .map((m) => ({ ...m, citations: m.citations ? JSON.parse(m.citations) : [] }));
  res.json({ messages });
});

// ---- Streaming chat (SSE) ----

const SYSTEM_PROMPT = `You are a research assistant answering questions using only the excerpts provided below, retrieved from the user's own documents.

Rules:
- Answer using only information in the excerpts. If the excerpts don't contain the answer, say so plainly instead of guessing.
- When you use a fact from an excerpt, cite it inline like [1], [2] matching the excerpt numbers below.
- Be concise and direct. Do not pad your answer with restatements of the question.`;

router.post('/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  const convo = getConversationWithLibrary(conversationId);
  if (!convo || convo.library_owner_id !== req.userId) {
    return res.status(403).json({ error: 'You do not have access to this conversation' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const userMessageId = uuid();
  db.prepare(
    'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(userMessageId, conversationId, 'user', content.trim());

  try {
    const queryEmbedding = await embedQuery(content.trim());
    const matches = topKChunks(convo.library_id, queryEmbedding, 5);

    const contextBlock = matches
      .map((m, i) => `[${i + 1}] (from "${m.filename}")\n${m.content}`)
      .join('\n\n---\n\n');

    const priorMessages = db
      .prepare(
        'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      )
      .all(conversationId);

    const messages = [
      ...priorMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: `Excerpts:\n\n${contextBlock || '(no relevant excerpts found)'}\n\nQuestion: ${content.trim()}`
      }
    ];

    send('citations', {
      citations: matches.map((m, i) => ({
        index: i + 1,
        documentName: m.filename,
        chunkIndex: m.chunkIndex,
        snippet: m.content.slice(0, 220)
      }))
    });

    const fullText = await streamLLM({
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 1024,
      onDelta: (text) => send('delta', { text })
    });

    const assistantMessageId = uuid();
    const citations = matches.map((m, i) => ({
      index: i + 1,
      documentName: m.filename,
      chunkIndex: m.chunkIndex,
      snippet: m.content.slice(0, 220)
    }));
    db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, citations) VALUES (?, ?, ?, ?, ?)'
    ).run(assistantMessageId, conversationId, 'assistant', fullText, JSON.stringify(citations));

    send('done', { messageId: assistantMessageId });
  } catch (err) {
    send('error', { error: err.message });
  } finally {
    res.end();
  }
});

module.exports = router;
