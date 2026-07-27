import { API_URL } from './api';

/**
 * Streams a chat response over SSE from a POST endpoint. Native EventSource
 * only supports GET, so this reads the fetch response body manually and
 * parses "event: X\ndata: Y\n\n" frames by hand.
 */
export async function streamChatMessage(conversationId, content, { onCitations, onDelta, onDone, onError }) {
  const token = localStorage.getItem('documind_token');

  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    onError?.(body.error || `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop(); // last (possibly incomplete) frame stays buffered

    for (const frame of frames) {
      const lines = frame.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        if (line.startsWith('data: ')) data = line.slice(6);
      }
      if (!data) continue;

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (event === 'citations') onCitations?.(parsed.citations);
      else if (event === 'delta') onDelta?.(parsed.text);
      else if (event === 'done') onDone?.(parsed);
      else if (event === 'error') onError?.(parsed.error);
    }
  }
}
