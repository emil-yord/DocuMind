/**
 * Splits text into overlapping chunks along paragraph/sentence boundaries
 * where possible, so each chunk is a coherent unit to embed and cite.
 *
 * targetSize / overlap are measured in characters (a rough but simple proxy
 * for tokens - good enough for a portfolio-scale RAG pipeline).
 */
function chunkText(text, targetSize = 1000, overlap = 150) {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= targetSize) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    // Current chunk is full - push it and start a new one, carrying a
    // small overlap from the end of the previous chunk for context continuity.
    if (current) {
      chunks.push(current);
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail;
    }

    if (para.length > targetSize) {
      // A single paragraph longer than targetSize - hard-split it by sentence.
      const sentences = para.match(/[^.!?]+[.!?]+|\S+$/g) || [para];
      for (const sentence of sentences) {
        if (current.length + sentence.length + 1 > targetSize) {
          chunks.push(current);
          const tail = current.slice(Math.max(0, current.length - overlap));
          current = tail + sentence;
        } else {
          current = current ? `${current} ${sentence}` : sentence;
        }
      }
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  if (current.trim()) chunks.push(current);

  return chunks.map((c) => c.trim()).filter(Boolean);
}

module.exports = { chunkText };
