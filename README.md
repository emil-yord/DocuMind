# DocuMind — AI-Powered Document Q&A (RAG)

Upload documents, then chat with an AI that answers questions grounded only
in what's actually in them — with inline citations pointing back to the
exact source passage. This is the Retrieval-Augmented Generation (RAG)
pattern behind most real-world AI products (Notion AI, enterprise support
bots, most "chat with your PDF" tools).

**Stack:** React (Vite) + Tailwind · Node/Express · Google Gemini API (chat) ·
Voyage AI (embeddings) · SQLite (better-sqlite3) · Server-Sent Events for
streaming

---

## Why this project, and what it demonstrates

- **A real RAG pipeline, not a wrapper around a chat API.** Text extraction →
  chunking → embedding → vector similarity search → grounded generation —
  the actual architecture behind production RAG systems.
- **Streaming responses over Server-Sent Events**, read token-by-token on
  the client — the standard pattern behind every modern AI chat UI, and a
  deliberately different transport than the WebSockets used in my other
  project (Corkboard), to show range.
- **Citation grounding.** The model is instructed to answer only from
  retrieved excerpts and cite them inline; the UI turns those citations
  into clickable footnote markers linked to the actual source snippet, so
  answers are auditable rather than trusted blindly.
- **Two-provider AI integration.** Chat and embeddings are two different
  specialized models (Google Gemini for generation, Voyage AI for
  embeddings) — a realistic example of composing multiple AI services
  rather than treating "AI" as a single monolithic API call.

## Architecture

```
documind/
├── server/
│   ├── db.js              SQLite schema: users, libraries, documents, chunks, conversations, messages
│   ├── server.js           Express entry point
│   ├── lib/
│   │   ├── embeddings.js    Voyage AI client
│   │   ├── llm.js           Google Gemini client with manual SSE parsing for streaming
│   │   ├── chunker.js       Paragraph/sentence-aware text chunking with overlap
│   │   └── vectorSearch.js  Cosine similarity top-K search over stored embeddings
│   └── routes/
│       ├── auth.js          Register/login (JWT + bcrypt)
│       ├── libraries.js     Libraries + document upload/processing pipeline
│       └── chat.js          Conversations + SSE-streamed RAG chat endpoint
└── client/
    └── src/
        ├── streamChat.js         Hand-rolled SSE client (EventSource doesn't support POST)
        ├── components/CitedText.jsx  Renders [1] [2] markers as clickable citation tabs
        └── pages/                 Libraries, Library (upload + docs), Chat
```

### The RAG pipeline, end to end

1. **Upload** — a PDF or text file is parsed (`pdf-parse` for PDFs)
2. **Chunk** — text is split into ~1000-character chunks along paragraph
   boundaries, with a small overlap so context isn't lost at chunk edges
3. **Embed** — each chunk is sent to Voyage AI (`voyage-3-large`) and stored
   as a vector alongside its text
4. **Retrieve** — when the user asks a question, the question itself is
   embedded, then compared against every stored chunk in that library via
   cosine similarity; the top 5 matches are pulled as context
5. **Generate** — those excerpts are inserted into a system prompt
   instructing Gemini to answer *only* from them and cite which excerpt
   supports each claim, then the response is streamed back token-by-token

The vector search is a brute-force scan in JavaScript rather than a
dedicated vector database — a deliberate, honest tradeoff for
portfolio-scale data (thousands of chunks, not millions). The `topKChunks`
function is the one place you'd swap in pgvector, Chroma, or a managed
vector store if this needed to scale.

## Getting started

Requires Node.js 18+ and two free API keys.

### 1. Get API keys

Both are free and require no credit card.

- **Google Gemini**: https://aistudio.google.com/apikey → create an API key
- **Voyage AI**: https://dash.voyageai.com/ → create an API key (free tier
  includes 200M tokens)

### 2. Start the API server

```bash
cd server
cp .env.example .env      # then paste your two API keys into .env
npm install
npm run dev
```

Runs on `http://localhost:4001`. The SQLite database is created
automatically on first run.

### 3. Start the client

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5174`. Register, create a library, upload a PDF or
text file, wait for it to show "Ready", then start a chat.

## Possible extensions

- Swap the brute-force cosine search for pgvector once the corpus grows
- Add a reranker step (e.g. Voyage's rerank endpoint) before generation for
  higher-precision retrieval
- Support multi-turn follow-up question suggestions (agentic RAG)
- Add usage/cost tracking per conversation
- Deploy the server to Render/Railway and the client to Vercel for a live
  demo link
