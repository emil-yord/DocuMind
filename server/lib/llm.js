const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

/**
 * Streams a chat completion from Gemini, calling onDelta(text) for every
 * incremental chunk of the response as it's generated. Returns the full
 * concatenated text once the stream completes.
 *
 * `messages` uses the same {role: 'user'|'assistant', content} shape as the
 * rest of this app; Gemini calls the assistant role 'model' instead, and
 * expects text wrapped in a `parts` array, so we translate both here.
 */
async function streamLLM({ system, messages, maxTokens = 1024, onDelta }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to server/.env');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const res = await fetch(`${GEMINI_URL}?alt=sse&key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: maxTokens }
    })
  });

  if (!res.ok || !res.body) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last (possibly incomplete) line stays in the buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        fullText += text;
        if (onDelta) onDelta(text);
      }
    }
  }

  return fullText;
}

module.exports = { streamLLM };
