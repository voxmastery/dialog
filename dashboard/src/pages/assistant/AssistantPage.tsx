import { useState, useCallback, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useAsk } from '@/hooks/useAsk';
import type { AiResponse } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
}

interface Suggestion {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: 'bolt' | 'alert' | 'chart' | 'search';
  readonly query: string;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly hoverBg: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUGGESTIONS: readonly Suggestion[] = [
  {
    title: 'Why is latency spiking?',
    subtitle: 'Analyze recent p95 trends',
    icon: 'bolt',
    query: 'Why is latency spiking?',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    hoverBg: 'group-hover:bg-indigo-500 group-hover:text-white',
  },
  {
    title: 'Explain the last 5xx error',
    subtitle: 'Root cause analysis of failures',
    icon: 'alert',
    query: 'Explain the last 5xx error',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    hoverBg: 'group-hover:bg-rose-500 group-hover:text-white',
  },
  {
    title: 'Summarize system health',
    subtitle: 'Overview of all services',
    icon: 'chart',
    query: 'Summarize system health',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    hoverBg: 'group-hover:bg-emerald-500 group-hover:text-white',
  },
  {
    title: 'Find specific log patterns',
    subtitle: 'Search through millions of rows',
    icon: 'search',
    query: 'Find specific log patterns',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    hoverBg: 'group-hover:bg-amber-500 group-hover:text-white',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Icon Components                                                    */
/* ------------------------------------------------------------------ */

function BoltIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function AlertIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SearchIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

const ICON_MAP: Record<Suggestion['icon'], React.FC<{ className?: string }>> = {
  bolt: BoltIcon,
  alert: AlertIcon,
  chart: ChartIcon,
  search: SearchIcon,
};

/* ------------------------------------------------------------------ */
/*  Suggestion Chip                                                    */
/* ------------------------------------------------------------------ */

function SuggestionChip({ suggestion, onClick }: { readonly suggestion: Suggestion; readonly onClick: () => void }) {
  const IconComp = ICON_MAP[suggestion.icon];
  return (
    <button className="glass-chip p-5 rounded-2xl flex items-center gap-4 text-left group" onClick={onClick}>
      <div className={`w-10 h-10 rounded-xl ${suggestion.iconBg} flex items-center justify-center ${suggestion.iconColor} ${suggestion.hoverBg} transition-all`}>
        <IconComp className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-white">{suggestion.title}</div>
        <div className="text-xs text-gray-500 mt-1">{suggestion.subtitle}</div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onSuggestionClick }: { readonly onSuggestionClick: (query: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
      <div className="text-center max-w-2xl w-full">
        {/* Logo */}
        <div className="mb-8 relative inline-flex">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 blur-2xl opacity-20" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 9H16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              <path d="M8 13H13" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </svg>
            <div className="absolute -right-2 -top-2 flex gap-1">
              <div className="w-1 h-4 bg-white/40 rounded-full animate-[bounce_1.2s_infinite]" />
              <div className="w-1 h-6 bg-white/60 rounded-full animate-[bounce_1s_infinite]" />
              <div className="w-1 h-4 bg-white/40 rounded-full animate-[bounce_1.4s_infinite]" />
            </div>
          </div>
        </div>

        <h1 className="text-[28px] font-semibold text-white mb-3">Ask Dialog</h1>
        <p className="text-gray-400 text-base mb-12">
          Query your logs, troubleshoot errors, or ask about runtime performance in plain English.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {SUGGESTIONS.map((s) => (
            <SuggestionChip key={s.title} suggestion={s} onClick={() => onSuggestionClick(s.query)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pulsing Dots Loader                                                */
/* ------------------------------------------------------------------ */

function PulsingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3">
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Render Content with Code Blocks                                    */
/* ------------------------------------------------------------------ */

function renderContent(content: string) {
  // Split on code block fences
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      // Remove optional language tag on first line
      const firstNewline = inner.indexOf('\n');
      const code = firstNewline >= 0 ? inner.slice(firstNewline + 1) : inner;
      return (
        <pre key={i} className="code-block rounded-xl overflow-hidden my-3">
          <code className="block p-4 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
            {code}
          </code>
        </pre>
      );
    }
    // Render inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith('`') && ip.endsWith('`')) {
            return (
              <code key={j} className="bg-white/5 px-1 rounded text-indigo-300 font-mono text-xs">
                {ip.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{ip}</span>;
        })}
      </span>
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Chat Message Bubble                                                */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { readonly message: ChatMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (message.role === 'user') {
    return (
      <div className="flex justify-end items-start gap-3">
        <div className="flex flex-col items-end gap-1.5 max-w-[80%]">
          <div className="message-bubble-user px-4 py-2.5 rounded-2xl rounded-tr-none text-white text-sm shadow-lg">
            {message.content}
          </div>
          <span className="text-[10px] text-gray-500 font-mono">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
        <BoltIcon className="w-5 h-5 text-white" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-[90%]">
        <div className="text-sm text-gray-300 leading-relaxed">
          {renderContent(message.content)}
        </div>
        <span className="text-[10px] text-gray-600 font-mono">{time}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Input Bar                                                          */
/* ------------------------------------------------------------------ */

interface InputBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly isLoading: boolean;
}

function InputBar({ value, onChange, onSubmit, isLoading }: InputBarProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && value.trim() && !isLoading) {
        e.preventDefault();
        onSubmit();
      }
    },
    [value, isLoading, onSubmit],
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 p-8 pointer-events-none z-40">
      <div className="max-w-[1000px] mx-auto w-full pointer-events-auto">
        <div className="glass-card rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
          <div className="pl-4 text-indigo-400">
            <BoltIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Ask about recent deployments, error spikes, or query logs..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-200 px-2 py-3 placeholder-gray-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] text-gray-500 font-mono border border-white/10 rounded px-1.5 py-0.5 bg-white/5">
              &#x2318;K
            </span>
            <button
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              onClick={onSubmit}
              disabled={!value.trim() || isLoading}
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AssistantPage (main export)                                        */
/* ------------------------------------------------------------------ */

export function AssistantPage() {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const askMutation = useAsk();
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, askMutation.isPending]);

  const sendMessage = useCallback(
    (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || askMutation.isPending) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      askMutation.mutate(question, {
        onSuccess: (data: AiResponse) => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: data.success ? (data.answer ?? 'No response received.') : `Error: ${data.error ?? 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (err: Error) => {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${err.message}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        },
      });
    },
    [input, askMutation],
  );

  const handleSuggestionClick = useCallback(
    (query: string) => {
      sendMessage(query);
    },
    [sendMessage],
  );

  const handleSubmit = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

  if (!hasMessages) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 -my-6 overflow-hidden">
        <EmptyState onSuggestionClick={handleSuggestionClick} />
        <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={askMutation.isPending} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 -my-6 overflow-hidden">
      <main
        ref={scrollRef}
        className="flex-1 flex flex-col max-w-[1000px] mx-auto w-full px-6 py-8 gap-8 overflow-y-auto"
      >
        <div className="flex flex-col gap-8 pb-32">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {askMutation.isPending && (
            <div className="flex justify-start items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                <BoltIcon className="w-5 h-5 text-white" />
              </div>
              <PulsingDots />
            </div>
          )}
        </div>
      </main>

      <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={askMutation.isPending} />
    </div>
  );
}
