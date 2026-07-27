import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Libraries() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get('/libraries')
      .then(({ data }) => setLibraries(data.libraries))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/libraries', { name: newName.trim() });
      navigate(`/libraries/${data.library.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-mono text-xs tracking-widest text-inkMuted uppercase">
            DocuMind
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-inkMuted">{user?.name}</span>
          <button onClick={logout} className="text-sm text-inkMuted hover:text-ink transition">
            Sign out
          </button>
        </div>
      </header>

      <h1 className="font-display text-3xl font-semibold mb-1">Your libraries</h1>
      <p className="text-inkMuted text-sm mb-8">
        A library is a collection of documents you can ask questions about.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New library name… e.g. Research papers"
          className="flex-1 bg-paperRaised border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-accent text-paperRaised font-semibold rounded px-4 py-2 text-sm hover:brightness-110 transition disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create library'}
        </button>
      </form>

      {loading ? (
        <p className="text-inkMuted text-sm">Loading libraries…</p>
      ) : libraries.length === 0 ? (
        <div className="border border-dashed border-line rounded-lg p-10 text-center text-inkMuted text-sm">
          No libraries yet. Create your first one above, then upload a document to start asking
          it questions.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {libraries.map((lib) => (
            <Link
              key={lib.id}
              to={`/libraries/${lib.id}`}
              className="bg-paperRaised border border-line rounded-lg p-5 hover:border-accent transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-inkMuted uppercase tracking-wide">
                  Library
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-line group-hover:bg-accent transition" />
              </div>
              <h2 className="font-display text-lg font-semibold group-hover:text-accent transition">
                {lib.name}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
