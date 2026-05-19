'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function Wordmark() {
  return (
    <span className="tracking-[.22em] uppercase text-sm select-none">
      <span className="font-light text-gray-900">went</span>
      <span className="font-semibold text-gray-900">here</span>
    </span>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Incorrect email or password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Wordmark />
          <p className="mt-4 text-xs text-gray-400 tracking-wide">your travels on a globe</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-md ring-1 ring-gray-200 px-8 py-8 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-700 tracking-wide uppercase" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2.5 bg-white text-sm text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900
                         focus:border-transparent transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-700 tracking-wide uppercase" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2.5 bg-white text-sm text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900
                         focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2.5 bg-gray-950 text-white rounded-md text-sm font-medium
                       hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          <a
            href={`/${process.env.NEXT_PUBLIC_OWNER_USERNAME ?? ''}`}
            className="hover:text-gray-700 transition-colors"
          >
            View public globe →
          </a>
        </p>
      </div>
    </main>
  );
}
