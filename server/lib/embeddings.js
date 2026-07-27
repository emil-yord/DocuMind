const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

/**
 * Embed a batch of texts with Voyage AI.
 * inputType should be 'document' when embedding content to store,
 * and 'query' when embedding a user's question at search time -
 * Voyage's models are tuned to treat the two differently for better retrieval.
 */
async function embedTexts(texts, inputType = 'document') {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not set. Add it to server/.env');
  }
  if (texts.length === 0) return [];

  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: texts,
      model: process.env.VOYAGE_MODEL || 'voyage-3-large',
      input_type: inputType
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  // Voyage returns results in the same order as the input array
  return data.data.map((item) => item.embedding);
}

async function embedQuery(text) {
  const [embedding] = await embedTexts([text], 'query');
  return embedding;
}

module.exports = { embedTexts, embedQuery };
