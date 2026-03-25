import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LogLevel } from '@/lib/types';

type ChannelType = 'slack' | 'telegram' | 'whatsapp';

interface ChannelState {
  readonly enabled: boolean;
  readonly webhookUrl: string;
  readonly channel: string;
  readonly botToken: string;
  readonly chatId: string;
  readonly valid: boolean;
}

const SEVERITY_LEVELS: readonly { level: LogLevel | 'DEBUG'; color: string; activeClass: string }[] = [
  { level: 'DEBUG', color: 'bg-blue-400', activeClass: 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md' },
  { level: 'INFO', color: 'bg-emerald-400', activeClass: 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md' },
  { level: 'WARN', color: 'bg-amber-400', activeClass: 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md' },
  { level: 'ERROR', color: 'bg-rose-500', activeClass: 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md' },
  { level: 'FATAL', color: 'bg-purple-500', activeClass: 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md' },
];

function ToggleSwitch({
  checked,
  onChange,
  scale,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly scale?: string;
}) {
  return (
    <div className={`relative inline-flex items-center cursor-pointer ${scale ?? ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
    </div>
  );
}

export function AlertsPage() {
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Record<ChannelType, ChannelState>>({
    slack: { enabled: true, webhookUrl: '', channel: '#alerts', botToken: '', chatId: '', valid: true },
    telegram: { enabled: true, webhookUrl: '', channel: '', botToken: '', chatId: '', valid: false },
    whatsapp: { enabled: false, webhookUrl: '', channel: '', botToken: '', chatId: '', valid: false },
  });

  const [severity, setSeverity] = useState<LogLevel | 'DEBUG'>('ERROR');
  const [cooldown, setCooldown] = useState(5);
  const [errorRateSpikeEnabled, setErrorRateSpikeEnabled] = useState(true);
  const [spikeMultiplier, setSpikeMultiplier] = useState('3');
  const [newErrorTypesEnabled, setNewErrorTypesEnabled] = useState(true);

  const updateChannel = useCallback((channel: ChannelType, updates: Partial<ChannelState>) => {
    setChannels((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], ...updates },
    }));
  }, []);

  const handleSave = useCallback(() => {
    // Save configuration - would call API in production
    navigate('/settings');
  }, [navigate]);

  return (
    <>
      {/* Header */}
      <header className="sticky top-16 z-40 backdrop-blur-xl border-b border-white/[0.06] bg-[#0A0A0F]/80">
        <div className="max-w-[1000px] mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-base font-semibold text-white tracking-tight">Alert Configuration</h1>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium bg-indigo-600 border border-indigo-500 rounded-md text-white hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            Save
          </button>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-6 py-10 flex flex-col gap-12">
        {/* Notification Channels */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white">Notification Channels</h2>
            <p className="text-sm text-gray-500 mt-1">Configure where alerts are sent when rules are triggered.</p>
          </div>

          <div className="space-y-4">
            {/* Slack */}
            <div className="glass-card rounded-xl overflow-hidden border-l-4 border-l-purple-500/80">
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 15a2.5 2.5 0 1 1-2.5-2.5H6V15zm1.5 0a2.5 2.5 0 1 1 5 0v6a2.5 2.5 0 1 1-5 0v-6zm2.5-11.5a2.5 2.5 0 1 1 2.5 2.5H10V3.5zm0 1.5a2.5 2.5 0 1 1 0 5h-6a2.5 2.5 0 1 1 0-5h6zM18 9a2.5 2.5 0 1 1 2.5 2.5H18V9zm-1.5 0a2.5 2.5 0 1 1-5 0V3a2.5 2.5 0 1 1 5 0v6zm-2.5 11.5a2.5 2.5 0 1 1-2.5-2.5H14v2.5zm0-1.5a2.5 2.5 0 1 1 0-5h6a2.5 2.5 0 1 1 0 5h-6z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Slack</h3>
                      <p className="text-xs text-gray-400">Send alerts to a Slack workspace</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={channels.slack.enabled}
                    onChange={(checked) => updateChannel('slack', { enabled: checked })}
                  />
                </div>
                {channels.slack.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://hooks.slack.com/services/..."
                        value={channels.slack.webhookUrl}
                        onChange={(e) => updateChannel('slack', { webhookUrl: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 font-mono transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Channel
                      </label>
                      <input
                        type="text"
                        value={channels.slack.channel}
                        onChange={(e) => updateChannel('slack', { channel: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 font-mono transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <button className="px-4 py-2 text-xs font-medium border border-white/10 rounded-md text-gray-300 hover:bg-white/5 transition-all">
                        Test Connection
                      </button>
                      {channels.slack.valid && (
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-medium">Valid</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Telegram */}
            <div className="glass-card rounded-xl overflow-hidden border-l-4 border-l-blue-500/80">
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0088cc] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.35-.01-1.02-.2-1.51-.37-.62-.2-1.11-.31-1.07-.65.02-.18.27-.36.75-.55 2.93-1.27 4.88-2.11 5.85-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Telegram</h3>
                      <p className="text-xs text-gray-400">Receive notifications via Telegram Bot</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={channels.telegram.enabled}
                    onChange={(checked) => updateChannel('telegram', { enabled: checked })}
                  />
                </div>
                {channels.telegram.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Bot Token
                      </label>
                      <input
                        type="password"
                        value={channels.telegram.botToken}
                        onChange={(e) => updateChannel('telegram', { botToken: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 font-mono transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        Chat ID
                      </label>
                      <input
                        type="text"
                        placeholder="123456789"
                        value={channels.telegram.chatId}
                        onChange={(e) => updateChannel('telegram', { chatId: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 font-mono transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 text-xs font-medium border border-white/10 rounded-md text-gray-300 hover:bg-white/5 transition-all">
                        Test
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className={`glass-card rounded-xl overflow-hidden ${!channels.whatsapp.enabled ? 'opacity-60' : ''}`}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#25D366]/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.897-5.335 11.9-11.894a11.83 11.83 0 00-3.481-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">WhatsApp</h3>
                    <p className="text-xs text-gray-500 italic">Not configured</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={channels.whatsapp.enabled}
                  onChange={(checked) => updateChannel('whatsapp', { enabled: checked })}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Alert Rules */}
        <section className="grid grid-cols-1 gap-8">
          <div className="mb-2">
            <h2 className="text-lg font-medium text-white">Alert Rules</h2>
            <p className="text-sm text-gray-500 mt-1">Define the logic that triggers a notification.</p>
          </div>

          <div className="space-y-8 glass-card rounded-xl p-8 border-white/5">
            {/* Minimum Severity */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                Minimum Severity
              </label>
              <div className="flex p-1 bg-white/[0.03] rounded-lg border border-white/10 w-fit">
                {SEVERITY_LEVELS.map(({ level, color }) => (
                  <button
                    key={level}
                    onClick={() => setSeverity(level)}
                    className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 ${
                      severity === level
                        ? 'text-white bg-indigo-500/20 border border-indigo-500/30 rounded-md'
                        : 'text-gray-400 hover:text-gray-200 transition-colors'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${color} ${
                        severity === level && level === 'ERROR' ? 'shadow-[0_0_6px_rgba(244,63,94,0.5)]' : ''
                      }`}
                    />
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2 italic">
                Only notify for events at or above the selected level.
              </p>
            </div>

            {/* Cooldown */}
            <div className="flex items-start justify-between border-t border-white/5 pt-8">
              <div>
                <label className="block text-sm font-medium text-gray-200">Cooldown Period</label>
                <p className="text-xs text-gray-500 mt-1">
                  Wait time before re-sending a notification for the same error.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-md">
                  <input
                    type="number"
                    value={cooldown}
                    min={1}
                    max={60}
                    onChange={(e) => setCooldown(parseInt(e.target.value, 10) || 1)}
                    className="w-14 bg-transparent px-3 py-1.5 text-sm text-center font-mono focus:outline-none"
                  />
                  <div className="flex flex-col border-l border-white/10">
                    <button
                      onClick={() => setCooldown((prev) => Math.min(60, prev + 1))}
                      className="px-1.5 py-0.5 hover:bg-white/5 text-[10px]"
                    >
                      &#9650;
                    </button>
                    <button
                      onClick={() => setCooldown((prev) => Math.max(1, prev - 1))}
                      className="px-1.5 py-0.5 border-t border-white/10 hover:bg-white/5 text-[10px]"
                    >
                      &#9660;
                    </button>
                  </div>
                </div>
                <span className="text-sm text-gray-400">minutes</span>
              </div>
            </div>

            {/* Error Rate Spike */}
            <div className="flex items-start justify-between border-t border-white/5 pt-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <label className="text-sm font-medium text-gray-200">Error Rate Spike</label>
                  <ToggleSwitch
                    checked={errorRateSpikeEnabled}
                    onChange={setErrorRateSpikeEnabled}
                    scale="scale-90"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Alert when error rate exceeds</span>
                  <input
                    type="text"
                    value={spikeMultiplier}
                    onChange={(e) => setSpikeMultiplier(e.target.value)}
                    className="w-10 h-7 text-center bg-white/[0.03] border border-white/10 rounded px-1 text-xs font-mono transition-all focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                  />
                  <span className="text-xs text-gray-400">x the rolling hourly average</span>
                </div>
              </div>
            </div>

            {/* New Error Types */}
            <div className="flex items-start justify-between border-t border-white/5 pt-8">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-200">New Error Types</label>
                  <ToggleSwitch
                    checked={newErrorTypesEnabled}
                    onChange={setNewErrorTypesEnabled}
                    scale="scale-90"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 italic">
                  Alert immediately when a previously unseen error signature is detected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notification Preview */}
        <section className="pb-32">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white">Notification Preview</h2>
            <p className="text-sm text-gray-500 mt-1">See how your alerts will look in external apps.</p>
          </div>

          <div className="p-6 bg-slate-900/50 rounded-xl border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

            <div className="max-w-[400px] bg-[#1a1d21] border border-white/10 rounded-lg shadow-2xl p-4 flex flex-col gap-2 font-sans relative z-10 mx-auto">
              <div className="flex items-center gap-2 text-[11px] font-bold text-rose-500 uppercase">
                <span>Alert -- Critical</span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-400 lowercase font-normal">just now</span>
              </div>
              <div className="text-sm font-semibold text-white leading-snug">
                ERROR -- POST /api/checkout returned 500
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex gap-1.5">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-mono bg-white/5 px-1 rounded text-gray-300">
                    localhost:3000 (Express)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-gray-500">Error:</span>
                  <span className="font-mono text-rose-300">connect ETIMEDOUT 127.0.0.1:5432</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 italic">3 occurrences in last 5 min</span>
                <span className="text-[10px] font-medium text-indigo-400">View in Dashboard &rarr;</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed footer save bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-[#0A0A0F]/80 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto flex flex-col items-center gap-4">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
          >
            Save Configuration
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel changes
          </button>
        </div>
      </footer>
    </>
  );
}
