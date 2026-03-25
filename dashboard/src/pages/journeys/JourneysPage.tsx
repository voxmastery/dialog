import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'dialog-recent-lookups';
const MAX_RECENT = 5;

const PILL_COLORS = [
  'bg-emerald-500/50',
  'bg-blue-500/50',
  'bg-purple-500/50',
  'bg-rose-500/50',
  'bg-amber-500/50',
] as const;

function getRecentLookups(): readonly string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function addRecentLookup(userId: string): readonly string[] {
  const existing = getRecentLookups().filter((id) => id !== userId);
  const updated = [userId, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function JourneysPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recentLookups, setRecentLookups] = useState<readonly string[]>(getRecentLookups);

  useEffect(() => {
    setRecentLookups(getRecentLookups());
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      setRecentLookups(addRecentLookup(trimmed));
      navigate(`/journeys/${encodeURIComponent(trimmed)}`);
    },
    [query, navigate],
  );

  const handleRecentClick = useCallback(
    (userId: string) => {
      setRecentLookups(addRecentLookup(userId));
      navigate(`/journeys/${encodeURIComponent(userId)}`);
    },
    [navigate],
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[calc(100vh-10rem)]">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        {/* Icon */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative w-32 h-32 glass-card rounded-3xl flex items-center justify-center shadow-2xl">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400 group-hover:text-indigo-400 transition-colors duration-500"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="11" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
              <path d="M8 14.5C8 12.5 9.34315 11.5 11 11.5C12.6569 11.5 14 12.5 14 14.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
            </svg>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="w-full max-w-[600px] mb-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-16 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white/[0.05] transition-all shadow-2xl"
              placeholder="Enter user ID, email, or session ID..."
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Empty state text */}
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-3">
          No journey found for this user
        </h1>
        <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-10">
          Dialog tracks user sessions by mapping discrete log events to a consistent identifier.
          Ensure your logs include a{' '}
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">userId</code>{' '}
          or{' '}
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">sessionId</code>{' '}
          attribute to visualize user flows.
        </p>

        {/* Recent lookups */}
        {recentLookups.length > 0 && (
          <div className="w-full pt-10 border-t border-white/[0.06]">
            <h2 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-4">
              Recent Lookups
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {recentLookups.map((userId, index) => (
                <button
                  key={userId}
                  onClick={() => handleRecentClick(userId)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-gray-400 hover:bg-white/[0.08] hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-2"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PILL_COLORS[index % PILL_COLORS.length]}`} />
                  {userId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-12 flex gap-4">
          <button className="px-5 py-2.5 text-sm font-medium bg-indigo-600 border border-indigo-500 rounded-lg text-white hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            Configure Identifiers
          </button>
          <button className="px-5 py-2.5 text-sm font-medium bg-white/[0.05] border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
            Read Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
