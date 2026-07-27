import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-mono text-xs tracking-widest text-inkMuted uppercase">
              DocuMind
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paperRaised border border-line rounded-lg p-6 space-y-4"
        >
          {error && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-inkMuted uppercase mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Ada Lovelace"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-inkMuted uppercase mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-inkMuted uppercase mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-paperRaised font-semibold rounded py-2 text-sm hover:brightness-110 transition disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-inkMuted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
