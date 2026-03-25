import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

const INSTALL_COMMANDS = [
  'npm install -g dialog',
  'dialog-cli start',
  'dialog-web start',
];

const QUICK_REFERENCE = [
  { command: 'dialog-cli start', description: 'Start the daemon' },
  { command: 'dialog-cli errors', description: 'View recent errors' },
  { command: 'dialog-cli ask "why is it slow?"', description: 'AI-powered log query' },
  { command: 'dialog-cli logs --level error', description: 'Filter error logs' },
  { command: 'dialog-web start', description: 'Open web dashboard' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-gray-500 hover:text-gray-300 transition-colors p-1"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      )}
    </button>
  );
}

const STEPS = ['Install', 'Ready'] as const;

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#0A0A0F] relative flex flex-col items-center justify-center px-4">
      <AmbientGlow />

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-colors duration-300',
                  index <= currentStep ? 'bg-indigo-500' : 'bg-white/20'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-300',
                  index <= currentStep ? 'text-white' : 'text-gray-600'
                )}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="w-12 h-px bg-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">
        {currentStep === 0 && (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Welcome to Dialog <span role="img" aria-label="wave">&#x1F44B;</span>
            </h1>
            <p className="text-sm text-gray-400 mb-8">
              Let&apos;s get you set up in under 60 seconds.
            </p>

            {/* Terminal block */}
            <div className="code-block rounded-xl p-5 text-left font-mono text-sm mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="space-y-3">
                {INSTALL_COMMANDS.map((cmd) => (
                  <div key={cmd} className="flex items-center justify-between group">
                    <p className="text-gray-300">
                      <span className="text-indigo-400">$</span> {cmd}
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={cmd} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-medium hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/20 transition-all duration-200"
            >
              Next &rarr;
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="text-center">
            {/* Checkmark */}
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-white mb-2">You&apos;re all set!</h1>
            <p className="text-sm text-gray-400 mb-8">
              Here&apos;s a quick reference to get you started.
            </p>

            {/* Quick reference card */}
            <GlassCard className="text-left mb-8" hover={false}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Quick Reference
              </h3>
              <div className="space-y-3">
                {QUICK_REFERENCE.map(({ command, description }) => (
                  <div key={command} className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-indigo-400 font-mono">{command}</code>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                    <CopyButton text={command} />
                  </div>
                ))}
              </div>
            </GlassCard>

            <Link
              to="/"
              className="inline-block px-8 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-medium hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/20 transition-all duration-200"
            >
              Go to Dashboard &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
