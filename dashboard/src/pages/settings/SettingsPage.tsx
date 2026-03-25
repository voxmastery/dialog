import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { GlassCard } from '@/components/ui/GlassCard';
import { FrameworkBadge } from '@/components/ui/Badge';
import type { ServiceInfo } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

const DEFAULT_PORTS = [3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888];

const SCAN_INTERVALS = [
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '30', label: '30s' },
  { value: '60', label: '60s' },
];

const RETENTION_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: servicesData } = useServices();
  const services = servicesData?.services ?? [];

  const [portScanEnabled, setPortScanEnabled] = useState(true);
  const [ports, setPorts] = useState<readonly number[]>(DEFAULT_PORTS);
  const [scanInterval, setScanInterval] = useState('10');
  const [retention, setRetention] = useState('7');
  const [newPort, setNewPort] = useState('');
  const [newDockerPort, setNewDockerPort] = useState('');
  const [newDockerId, setNewDockerId] = useState('');

  const handleRemovePort = useCallback((port: number) => {
    setPorts((prev) => prev.filter((p) => p !== port));
  }, []);

  const handleAddPort = useCallback(() => {
    const parsed = parseInt(newPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 65535 && !ports.includes(parsed)) {
      setPorts((prev) => [...prev, parsed]);
      setNewPort('');
    }
  }, [newPort, ports]);

  return (
    <div className="max-w-[700px] mx-auto py-6">
      {/* Monitored Services */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/[0.05] rounded-lg text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Monitored Services</h2>
        </div>

        <div className="space-y-1">
          {services.map((svc: ServiceInfo) => (
            <div
              key={svc.port}
              className="flex items-center justify-between p-4 glass-card rounded-xl hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-2 h-2 rounded-full ${
                    svc.status === 'OK'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : svc.status === 'WARN'
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  }`}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">localhost:{svc.port}</span>
                    <FrameworkBadge framework={svc.framework} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 font-mono">
                    <span>PID {svc.pid}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span>Monitoring since: active</span>
                  </div>
                </div>
              </div>
              <button
                className="p-1.5 text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Remove service on port ${svc.port}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {services.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No services currently monitored</div>
          )}
        </div>

        {/* Add service */}
        <div className="mt-4 p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Port Number
              </label>
              <input
                type="text"
                placeholder="e.g. 8080"
                value={newDockerPort}
                onChange={(e) => setNewDockerPort(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Docker ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Container Name/ID"
                value={newDockerId}
                onChange={(e) => setNewDockerId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
              />
            </div>
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        </div>
      </section>

      <div className="h-px bg-white/[0.06] mb-12" />

      {/* Port Scanning */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Port Scanning</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Auto-scan ports</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={portScanEnabled}
                onChange={(e) => setPortScanEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs text-gray-400 mb-3">Ports to scan</label>
            <div className="flex flex-wrap gap-2">
              {ports.map((port) => (
                <div
                  key={port}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-gray-300"
                >
                  {port}
                  <button
                    onClick={() => handleRemovePort(port)}
                    className="text-gray-500 hover:text-rose-400 transition-colors"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddPort}
                className="flex items-center justify-center p-1 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Scan interval</label>
            <select
              value={scanInterval}
              onChange={(e) => setScanInterval(e.target.value)}
              className="bg-white/[0.03] border border-white/10 rounded-md text-xs py-1.5 px-3 text-gray-300 min-w-[80px] focus:outline-none focus:border-indigo-500/50"
            >
              {SCAN_INTERVALS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.06] mb-12" />

      {/* Alerts summary */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Alerts</h2>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
              Slack &#10003;
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-500 border border-white/10 text-[10px] font-medium">
              Telegram
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-500 border border-white/10 text-[10px] font-medium">
              WhatsApp
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Minimum severity: <span className="text-gray-300">ERROR</span> &bull; Cooldown:{' '}
            <span className="text-gray-300">5 min</span>
          </div>
          <button
            onClick={() => navigate('/settings/alerts')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-400 text-xs font-medium hover:bg-indigo-500 hover:text-white transition-all group"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Configure Alerts &rarr;
          </button>
        </div>
      </section>

      <div className="h-px bg-white/[0.06] mb-12" />

      {/* Data Retention */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">Data Retention</h2>
        <div className="grid grid-cols-2 gap-8 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Keep logs for</label>
            <select
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg text-sm py-2 px-3 text-white focus:outline-none focus:border-indigo-500/50"
            >
              {RETENTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button className="py-2 px-4 rounded-lg border border-rose-500/30 text-rose-500 text-sm font-medium hover:bg-rose-500 hover:text-white transition-all">
            Clear all data
          </button>
        </div>
        <p className="mt-4 text-[11px] text-gray-500 italic">
          Estimated disk usage: ~340 MB for {retention} days at current volume
        </p>
      </section>

      <div className="h-px bg-white/[0.06] mb-12" />

      {/* AI Configuration */}
      <section className="mb-16">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">AI Configuration</h2>
        <GlassCard className="p-6 space-y-4" hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xs">
                M
              </div>
              <span className="text-sm font-medium text-white">AI Provider: Mistral</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Status:</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-400">Connected</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.03]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Model (standard)</span>
              <code className="text-[11px] font-mono text-gray-400">magistral-small-2506</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Model (complex)</span>
              <code className="text-[11px] font-mono text-gray-400">magistral-medium-2506</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Embeddings</span>
              <code className="text-[11px] font-mono text-gray-400">mistral-embed</code>
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="text-[11px] text-gray-500 italic">AI is built into Dialog. No API key needed.</p>
          </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-white/[0.06] text-center pb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href="https://github.com" className="text-gray-500 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </a>
        </div>
        <p className="text-[11px] font-medium text-gray-400">Dialog v0.1.0</p>
        <p className="text-[10px] text-gray-600 mt-1">
          Local-first AI-powered log analysis &bull; All data stays on your machine
        </p>
      </footer>
    </div>
  );
}
