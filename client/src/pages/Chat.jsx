import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { streamChatMessage } from '../streamChat';
import CitedText from '../components/CitedText';

export default function Chat() {
  const { libraryId, conversationId } = useParams();
  const [library, setLibrary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/libraries/${libraryId}`).then(({ data }) => setLibrary(data.library));
    api
      .get(`/conversations/${conversationId}/messages`)
      .then(({ data }) => setMessages(data.messages));
  }, [libraryId, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setError('');
    setInput('');
    setSending(true);

    const userMsg = { id: `local-${Date.now()}`, role: 'user', content, citations: [] };
    const assistantId = `local-assistant-${Date.now()}`;
    const assistantMsg = {
      id: assistantId,
      role: 'assistant',
      content: '',
      citations: [],
      streaming: true
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    await streamChatMessage(conversationId, content, {
      onCitations: (citations) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, citations } : m))
        );
      },
      onDelta: (text) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m))
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        setSending(false);
      },
      onError: (err) => {
        setError(err);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        setSending(false);
      }
    });
  }

  const lastAssistantCitations =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.citations?.length)
      ?.citations || [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line px-6 py-4 flex items-center gap-4">
        <Link
          to={`/libraries/${libraryId}`}
          className="text-inkMuted hover:text-ink transition text-sm shrink-0"
        >
          ← {library?.name || 'Library'}
        </Link>
        <h1 className="font-display text-lg font-semibold truncate">Ask your documents</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5 max-w-2xl mx-auto w-full">
            {messages.length === 0 && (
              <p className="text-sm text-inkMuted text-center mt-10">
                Ask a question about the documents in this library. Answers are grounded only in
                what's actually in them, with citations back to the source.
              </p>
            )}

            {messages.map((m) => (
              <div key={m.id} className="fade-in">
                <p className="text-[10px] font-mono uppercase tracking-wide text-inkMuted mb-1">
                  {m.role === 'user' ? 'You' : 'DocuMind'}
                </p>
                <div
                  className={
                    m.role === 'user'
                      ? 'bg-paperRaised border border-line rounded-lg px-4 py-3 text-sm'
                      : 'text-sm leading-relaxed'
                  }
                >
                  <CitedText
                    text={m.content || (m.streaming ? '' : '')}
                    citations={m.citations || []}
                    onCite={setActiveCitation}
                  />
                  {m.streaming && <span className="cursor-blink" />}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-red-700">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-line px-6 py-4 flex gap-2 max-w-2xl mx-auto w-full"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={sending}
              className="flex-1 bg-paperRaised border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-accent text-paperRaised font-semibold rounded px-4 py-2 text-sm hover:brightness-110 transition disabled:opacity-40"
            >
              {sending ? 'Thinking…' : 'Send'}
            </button>
          </form>
        </main>

        <aside className="hidden lg:block w-80 border-l border-line px-5 py-6 overflow-y-auto scrollbar-thin">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-inkMuted mb-4">
            Sources
          </h2>
          {lastAssistantCitations.length === 0 ? (
            <p className="text-xs text-inkMuted">
              Citations from the most recent answer will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {lastAssistantCitations.map((c) => (
                <div
                  key={c.index}
                  className={`margin-card bg-paperRaised rounded-r-md pl-3 pr-3 py-2.5 transition ${
                    activeCitation?.index === c.index ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <p className="text-[10px] font-mono text-gold mb-1">[{c.index}] {c.documentName}</p>
                  <p className="text-xs text-inkMuted leading-relaxed">{c.snippet}…</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
