import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';

function StatusBadge({ status }) {
  const styles = {
    processing: 'bg-goldSoft text-[#8A6529]',
    ready: 'bg-accentSoft text-accent',
    failed: 'bg-red-50 text-red-700'
  };
  const labels = { processing: 'Processing…', ready: 'Ready', failed: 'Failed' };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
}

export default function Library() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [library, setLibrary] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const load = useCallback(() => {
    return Promise.all([
      api.get(`/libraries/${libraryId}`),
      api.get(`/libraries/${libraryId}/conversations`)
    ]).then(([libRes, convoRes]) => {
      setLibrary(libRes.data.library);
      setDocuments(libRes.data.documents);
      setConversations(convoRes.data.conversations);
    });
  }, [libraryId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/libraries/${libraryId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await load();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteDocument(docId) {
    if (!confirm('Remove this document from the library?')) return;
    await api.delete(`/libraries/${libraryId}/documents/${docId}`);
    setDocuments((docs) => docs.filter((d) => d.id !== docId));
  }

  async function handleStartChat() {
    setStartingChat(true);
    try {
      const { data } = await api.post(`/libraries/${libraryId}/conversations`, {});
      navigate(`/libraries/${libraryId}/chat/${data.conversation.id}`);
    } finally {
      setStartingChat(false);
    }
  }

  const readyDocCount = documents.filter((d) => d.status === 'ready').length;

  if (loading) return <div className="p-10 text-inkMuted text-sm">Loading library…</div>;
  if (!library) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-inkMuted hover:text-ink transition text-sm">
          ← Libraries
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold mb-1">{library.name}</h1>
          <p className="text-inkMuted text-sm">
            {documents.length} document{documents.length !== 1 ? 's' : ''} · {readyDocCount} ready
            to search
          </p>
        </div>
        <button
          onClick={handleStartChat}
          disabled={readyDocCount === 0 || startingChat}
          className="bg-accent text-paperRaised font-semibold rounded px-4 py-2 text-sm hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={readyDocCount === 0 ? 'Upload a document first' : ''}
        >
          {startingChat ? 'Starting…' : '+ New chat'}
        </button>
      </div>

      <section className="mb-10">
        <h2 className="font-display text-lg font-semibold mb-3">Documents</h2>

        <label className="block border border-dashed border-line rounded-lg p-6 text-center cursor-pointer hover:border-accent transition mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileSelected}
            className="hidden"
            disabled={uploading}
          />
          <p className="text-sm text-inkMuted">
            {uploading ? 'Processing document…' : 'Click to upload a PDF, .txt, or .md file'}
          </p>
        </label>
        {uploadError && <p className="text-sm text-red-700 mb-3">{uploadError}</p>}

        {documents.length === 0 ? (
          <p className="text-sm text-inkMuted">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-paperRaised border border-line rounded-md px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{doc.filename}</p>
                  <p className="text-xs text-inkMuted font-mono">
                    {doc.status === 'ready' ? `${doc.chunk_count} chunks` : doc.error || ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-inkMuted hover:text-red-600 transition text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Conversations</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-inkMuted">
            No conversations yet. Start one once you've uploaded a document.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Link
                key={c.id}
                to={`/libraries/${libraryId}/chat/${c.id}`}
                className="block bg-paperRaised border border-line rounded-md px-4 py-2.5 hover:border-accent transition text-sm"
              >
                {c.title}
                <span className="text-xs text-inkMuted font-mono ml-2">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
