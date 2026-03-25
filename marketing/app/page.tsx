'use client';

import { useEffect } from 'react';

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function Home() {
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.scroll-animate').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Noise texture overlay */}
      <div className="bg-noise" />

      {/* Ambient glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl border-b border-white/[0.04] bg-[#050507]/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2 group">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white group-hover:text-indigo-400 transition-colors">
                <path d="M4 7V17C4 19.2091 5.79086 21 8 21H16C18.2091 21 20 19.2091 20 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 7L12 3L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 11L12 15L20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-white font-bold tracking-tight text-lg">Dialog</span>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#docs" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Docs</a>
              <a href="#mcp" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">MCP Setup</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative group hidden sm:block">
              <div className="absolute inset-0 bg-gradient-to-r from-accent1 to-accent2 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-300" />
              <div className="relative px-5 py-2 bg-gradient-to-r from-accent1 to-accent2 rounded-full flex items-center text-white text-sm font-medium shadow-lg">
                Get Started
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-[100vh] pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto z-10 scroll-animate opacity-0 translate-y-8 flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              v2.0 is now live
            </div>

            <h1 className="text-[44px] md:text-[56px] font-bold tracking-tight text-white leading-[1.1] mb-6 max-w-3xl">
              Your Application Speaks. <br />
              <span className="text-gradient-white">Dialog Translates.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              AI-powered log analysis that auto-attaches to your running project. Zero config. Zero cost. Ask questions in plain English.
            </p>

            {/* Terminal */}
            <div className="w-full max-w-3xl relative mx-auto group perspective-1000 mb-10">
              <div className="absolute -inset-1 bg-gradient-to-b from-indigo-500/30 to-purple-500/10 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <div className="relative bg-[#0A0A0F]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden text-left flex flex-col transform transition-transform duration-500 hover:scale-[1.01]">
                {/* Terminal title bar */}
                <div className="h-10 bg-white/[0.02] border-b border-white/[0.05] flex items-center px-4 gap-2 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-termRed" />
                  <div className="w-3 h-3 rounded-full bg-termYellow" />
                  <div className="w-3 h-3 rounded-full bg-termGreen" />
                  <div className="flex-1 text-center pr-10">
                    <span className="text-xs text-gray-500 font-mono">~/.dialog</span>
                  </div>
                </div>

                {/* Terminal content */}
                <div className="p-6 font-mono text-[13px] md:text-sm leading-relaxed text-gray-300">
                  {/* Install line */}
                  <div
                    className="flex justify-between items-center group/copy hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded transition-colors cursor-pointer mb-6"
                    onClick={() => copyToClipboard('npm install -g dialog')}
                  >
                    <div className="flex gap-3 items-center">
                      <span className="text-indigo-400 select-none">$</span>
                      <span className="text-white font-medium">npm install -g dialog</span>
                    </div>
                    <button className="text-gray-500 group-hover/copy:text-white transition-colors p-1" aria-label="Copy to clipboard">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* dialog-cli start */}
                  <div className="flex gap-3 mb-2">
                    <span className="text-indigo-400 select-none">$</span>
                    <span className="text-white">dialog-cli start</span>
                  </div>
                  <div className="flex gap-3 mb-1 pl-1">
                    <span className="text-emerald-400 select-none">●</span>
                    <span>Detected: localhost:3000 <span className="text-cyan-400">(Express)</span> PID 14523</span>
                  </div>
                  <div className="flex gap-3 mb-6 pl-1">
                    <span className="text-emerald-400 select-none">●</span>
                    <span>Detected: localhost:5173 <span className="text-cyan-400">(Vite)</span> PID 14601</span>
                  </div>

                  {/* dialog-web start */}
                  <div className="flex gap-3 mb-2">
                    <span className="text-indigo-400 select-none">$</span>
                    <span className="text-white">dialog-web start</span>
                  </div>
                  <div className="flex gap-3 pl-1">
                    <span className="text-blue-400 select-none">&#8505;</span>
                    <span>Dashboard: <a href="#" className="text-blue-400 underline hover:text-blue-300 transition-colors">http://localhost:9999</a></span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button className="relative group w-full sm:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-accent1 to-accent2 rounded-lg blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
                <div className="relative h-12 px-8 bg-gradient-to-r from-accent1 to-accent2 rounded-lg flex items-center justify-center text-white font-semibold text-base transition-transform active:scale-95 shadow-lg shadow-indigo-500/25">
                  Install Now &rarr;
                </div>
              </button>
              <button className="h-12 px-8 rounded-lg border border-white/15 bg-white/[0.02] hover:bg-white/[0.06] text-white font-medium flex items-center justify-center gap-2 transition-all w-full sm:w-auto active:scale-95">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                View Dashboard Demo
              </button>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-[13px] text-gray-500 font-medium">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                One install
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Two tools
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                No code changes to your app
              </span>
            </div>
          </div>
        </section>

        {/* Two Tools Section */}
        <section className="py-24 px-6 relative border-t border-white/[0.04] bg-gradient-to-b from-[#050507] to-[#0A0A0F]">
          <div className="max-w-6xl mx-auto scroll-animate">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold tracking-widest text-indigo-400 uppercase mb-3">The Dialog Platform</h2>
              <h3 className="text-3xl md:text-[40px] font-bold text-white tracking-tight">Two Tools, One Install</h3>
              <p className="text-gray-400 mt-4 text-lg">Same data. Same <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-gray-300">~/.dialog/</code> directory. Use either or both.</p>
            </div>

            <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
              {/* Connecting line */}
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent -translate-y-1/2 z-0" />

              {/* dialog-cli card */}
              <div className="flex-1 glass-panel rounded-2xl p-8 relative z-10 flex flex-col border-t border-white/10 bg-[#0A0A0F]/80">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">dialog-cli</h4>
                    <span className="text-sm text-indigo-300">Power of the terminal</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 font-mono text-xs text-gray-300 bg-black/40 rounded-xl p-4 border border-white/[0.05] term-scroll overflow-y-auto max-h-[280px]">
                  <div>
                    <div className="flex gap-2"><span className="text-indigo-400">$</span> <span className="text-white">dialog-cli errors</span></div>
                    <div className="pl-4 mt-2 border-l border-white/10 text-gray-400">
                      <div className="text-rose-400">TypeError: Cannot read properties of undefined (reading &apos;id&apos;)</div>
                      <div className="text-gray-500">at CheckoutService.process (/api/checkout.js:42:15)</div>
                      <div className="text-gray-500 mt-1">Occurred 14 times in last hour</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex gap-2"><span className="text-indigo-400">$</span> <span className="text-white">dialog-cli ask <span className="text-green-400">&quot;why did checkout fail?&quot;</span></span></div>
                    <div className="pl-4 mt-2 border-l-2 border-indigo-500 text-gray-300 bg-indigo-500/5 p-2 rounded-r">
                      <span className="text-white font-bold">&#10024; AI Analysis:</span> The checkout failed because the Stripe API key environment variable is missing in the production container, resulting in a 500 error on the /process-payment route.
                    </div>
                  </div>

                  <div className="pt-2 pb-2">
                    <div className="flex gap-2"><span className="text-indigo-400">$</span> <span className="text-white">dialog-cli journey --user 4521</span></div>
                    <div className="pl-4 mt-2 text-gray-400 space-y-1">
                      <div className="flex gap-2"><span className="text-gray-500">10:41:02</span> <span className="text-blue-300">GET /cart</span></div>
                      <div className="flex gap-2"><span className="text-gray-500">10:41:45</span> <span className="text-blue-300">POST /checkout</span></div>
                      <div className="flex gap-2"><span className="text-gray-500">10:41:46</span> <span className="text-rose-400 bg-rose-500/10 px-1 rounded text-[10px]">ERR 500</span> Stripe API Timeout</div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-6 leading-relaxed">
                  11 commands for logs, errors, journeys, AI queries, MCP integration, and more. Built for speed.
                </p>
              </div>

              {/* dialog-web card */}
              <div className="flex-1 glass-panel rounded-2xl p-8 relative z-10 flex flex-col border-t border-white/10 bg-[#0A0A0F]/80">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">dialog-web</h4>
                    <span className="text-sm text-purple-300">Beauty of a dashboard</span>
                  </div>
                </div>

                <div className="flex-1 bg-[#050507] rounded-xl border border-white/[0.05] overflow-hidden flex flex-col max-h-[280px]">
                  {/* Browser bar */}
                  <div className="h-8 bg-white/[0.03] border-b border-white/[0.05] flex items-center px-3 gap-2 shrink-0">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    </div>
                    <div className="mx-auto bg-black/50 rounded-md px-2 py-0.5 text-[10px] text-gray-500 font-mono">localhost:9999</div>
                  </div>
                  {/* Dashboard wireframe */}
                  <div className="p-3 flex gap-3 h-full">
                    {/* Sidebar */}
                    <div className="w-12 border-r border-white/[0.05] flex flex-col gap-3 shrink-0">
                      <div className="w-6 h-6 rounded bg-indigo-500/20 mx-auto mt-1" />
                      <div className="w-6 h-2 rounded bg-white/10 mx-auto mt-2" />
                      <div className="w-6 h-2 rounded bg-white/10 mx-auto" />
                      <div className="w-6 h-2 rounded bg-white/10 mx-auto" />
                    </div>
                    {/* Main content */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex gap-2 h-12">
                        <div className="flex-1 bg-white/[0.02] rounded-lg border border-white/[0.05] p-2 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-gray-600" />
                          <div className="w-12 h-3 rounded bg-emerald-400/80" />
                        </div>
                        <div className="flex-1 bg-white/[0.02] rounded-lg border border-white/[0.05] p-2 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-gray-600" />
                          <div className="w-10 h-3 rounded bg-rose-400/80" />
                        </div>
                      </div>
                      <div className="flex-1 bg-white/[0.02] rounded-lg border border-white/[0.05] p-2 flex flex-col gap-1.5 overflow-hidden">
                        <div className="h-1.5 rounded bg-indigo-500/50 w-1/3" />
                        <div className="h-1.5 rounded bg-gray-700 w-3/4" />
                        <div className="h-1.5 rounded bg-gray-700 w-1/2" />
                        <div className="h-1.5 rounded bg-rose-500/50 w-2/3" />
                        <div className="mt-auto self-end w-3/4 bg-purple-500/20 rounded-md p-1.5 border border-purple-500/30">
                          <div className="w-full h-1 rounded bg-purple-300/80 mb-1" />
                          <div className="w-2/3 h-1 rounded bg-purple-300/80" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-6 leading-relaxed">
                  Real-time dashboard with live log streaming, journey explorer, and AI chat.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 px-6 relative bg-[#050507]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 scroll-animate">
              <h2 className="text-3xl md:text-[36px] font-bold text-white tracking-tight mb-4">Everything you need to debug faster</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">One Install, Two Tools</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  <code className="text-indigo-300">npm install -g dialog</code> gives you both <code className="text-gray-300">dialog-cli</code> and <code className="text-gray-300">dialog-web</code>. Terminal and browser, your choice.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10" style={{ transitionDelay: '50ms' }}>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Zero Code Changes</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Dialog reads stdout/stderr externally. No SDK, no middleware, no agents in your code. Ever.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10" style={{ transitionDelay: '100ms' }}>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI-Powered Answers</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Ask <span className="text-gray-300 italic">&quot;why did checkout fail?&quot;</span> and get a real answer with timestamps, root causes, and suggested fixes.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10" style={{ transitionDelay: '150ms' }}>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">User Journey Replay</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  See exactly what a user did before it broke. Chronological timeline with root cause highlighting.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10" style={{ transitionDelay: '200ms' }}>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">MCP Integration</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Works with Claude, Cursor, and Windsurf. Your AI IDE queries your logs directly via <code className="text-gray-300">dialog-cli mcp-serve</code>.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="glass-panel p-8 rounded-2xl hover:bg-white/[0.03] transition-colors duration-300 group scroll-animate border-t border-white/10" style={{ transitionDelay: '250ms' }}>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M12 12h.01" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Live Streaming</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  <code className="text-gray-300">dialog-web</code> streams logs in real-time via WebSocket. Watch your application&apos;s heartbeat in the browser.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 px-6 relative bg-gradient-to-b from-[#050507] to-[#0A0A0F]">
          <div className="max-w-5xl mx-auto scroll-animate">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white tracking-tight">How it works</h2>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
              {/* Animated line */}
              <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-white/5 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-gradient-flow opacity-50" />
              </div>

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div className="w-16 h-16 rounded-full bg-[#0A0A0F] border border-white/10 flex items-center justify-center mb-4 shadow-xl z-10 relative">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md" />
                  <svg className="w-6 h-6 text-indigo-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div className="bg-white/5 border border-white/10 rounded px-3 py-1 font-mono text-xs text-indigo-300 mb-3 inline-block">
                  $ npm install -g dialog
                </div>
                <p className="text-sm text-gray-400 max-w-[200px]">One command installs both tools globally.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-[1.5]">
                <div className="flex gap-4 mb-4 relative z-10">
                  <div className="flex flex-col items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors">
                    <div className="font-mono text-xs text-white mb-2">$ dialog-cli start</div>
                    <p className="text-[11px] text-gray-500 leading-tight">Captures logs,<br />serves CLI</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-600 font-bold uppercase">or</div>
                  <div className="flex flex-col items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors">
                    <div className="font-mono text-xs text-white mb-2">$ dialog-web start</div>
                    <p className="text-[11px] text-gray-500 leading-tight">Dashboard on<br />localhost:9999</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 max-w-[250px] mt-2">Choose your preferred interface. They share the same local database.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div className="w-16 h-16 rounded-full bg-[#0A0A0F] border border-white/10 flex items-center justify-center mb-4 shadow-xl z-10 relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md" />
                  <svg className="w-6 h-6 text-purple-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Ask questions</h3>
                <p className="text-sm text-gray-400 max-w-[200px]">Ask anything in plain English — from terminal or browser.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 px-6 bg-[#050507]">
          <div className="max-w-5xl mx-auto scroll-animate">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-12 text-center">Dialog vs. The Status Quo</h2>

            <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-[#0A0A0F]/50">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10 text-sm">
                    <th className="p-5 font-medium text-gray-400 bg-white/[0.01]">Feature</th>
                    <th className="p-5 font-bold text-white bg-indigo-500/10 border-l-[3px] border-indigo-500 w-[22%]">Dialog</th>
                    <th className="p-5 font-medium text-gray-400 bg-white/[0.01] w-[20%]">Datadog</th>
                    <th className="p-5 font-medium text-gray-400 bg-white/[0.01] w-[20%]">grep + SSH</th>
                    <th className="p-5 font-medium text-gray-400 bg-white/[0.01] w-[20%]">ELK Stack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-sm">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">Setup</td>
                    <td className="p-5 text-indigo-200 font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500">1 npm install</td>
                    <td className="p-5 text-gray-500">Agent + config</td>
                    <td className="p-5 text-gray-500">N/A</td>
                    <td className="p-5 text-gray-500">Days of ops</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">Time to first log</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500">~10 seconds</td>
                    <td className="p-5 text-gray-500">30+ minutes</td>
                    <td className="p-5 text-gray-500">Manual</td>
                    <td className="p-5 text-gray-500">Hours</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">Modify your code?</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500">No</td>
                    <td className="p-5 text-gray-500">Yes (agent)</td>
                    <td className="p-5 text-gray-500">No</td>
                    <td className="p-5 text-gray-500">Yes (shipper)</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">CLI + Dashboard</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Both included
                    </td>
                    <td className="p-5 text-gray-500">Dashboard only</td>
                    <td className="p-5 text-gray-500">CLI only</td>
                    <td className="p-5 text-gray-500">Dashboard</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">AI queries</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Built-in
                    </td>
                    <td className="p-5 text-gray-500">Add-on</td>
                    <td className="p-5 text-gray-500">&mdash;</td>
                    <td className="p-5 text-gray-500">&mdash;</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium">IDE integration</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> MCP native
                    </td>
                    <td className="p-5 text-gray-500 flex items-center"><svg className="w-4 h-4 text-rose-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></td>
                    <td className="p-5 text-gray-500 flex items-center"><svg className="w-4 h-4 text-rose-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></td>
                    <td className="p-5 text-gray-500 flex items-center"><svg className="w-4 h-4 text-rose-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-5 text-gray-300 font-medium border-b-0">Monthly cost</td>
                    <td className="p-5 text-white font-medium bg-indigo-500/[0.05] border-l-[3px] border-indigo-500 border-b-0">$0</td>
                    <td className="p-5 text-gray-500 border-b-0">$15+/host</td>
                    <td className="p-5 text-gray-500 border-b-0">$0</td>
                    <td className="p-5 text-gray-500 border-b-0">$0 + DevOps</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MCP Integration Section */}
        <section id="mcp" className="py-24 px-6 bg-gradient-to-b from-[#0A0A0F] to-[#050507] scroll-animate">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Works with your AI IDE</h2>
              <p className="text-gray-400 text-lg">Add Dialog to Claude, Cursor, or Windsurf in 30 seconds. Your AI assistant can query your logs directly.</p>
            </div>

            <div className="glass-panel rounded-2xl p-8 border-t border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">MCP Configuration</h3>
                  <p className="text-sm text-gray-400">Add this to your IDE&apos;s MCP settings file</p>
                </div>
                <button
                  onClick={() => copyToClipboard(`{
  "mcpServers": {
    "dialog": {
      "command": "dialog-cli",
      "args": ["mcp-serve"]
    }
  }
}`)}
                  className="ml-auto px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy
                </button>
              </div>

              <div className="bg-black/50 rounded-xl p-6 font-mono text-sm text-gray-300 border border-white/[0.05] overflow-x-auto">
                <pre className="whitespace-pre">{`{
  "mcpServers": {
    "dialog": {
      "command": "dialog-cli",
      "args": ["mcp-serve"]
    }
  }
}`}</pre>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 items-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Compatible with</span>
                <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400">Claude Desktop</span>
                <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400">Claude Code</span>
                <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400">Cursor</span>
                <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400">Windsurf</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 bg-[#050507] scroll-animate">
          <div className="max-w-4xl mx-auto">
            <div className="p-[1px] rounded-[32px] bg-gradient-to-br from-indigo-500/50 via-purple-500/20 to-transparent relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-accent1 to-accent2 rounded-[32px] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />

              <div className="bg-[#0A0A0F] rounded-[31px] p-10 md:p-16 text-center relative z-10 flex flex-col items-center shadow-2xl">
                <h2 className="text-3xl md:text-[40px] font-bold text-white tracking-tight mb-10">Start debugging smarter in 10 seconds</h2>

                <div
                  className="bg-black/80 border border-white/[0.08] rounded-2xl p-4 md:p-6 mb-6 w-full max-w-lg flex items-center justify-between shadow-inner group/cmd cursor-pointer hover:border-indigo-500/30 transition-colors"
                  onClick={() => copyToClipboard('npm install -g dialog')}
                >
                  <code className="font-mono text-base md:text-xl text-white flex gap-3">
                    <span className="text-indigo-400 select-none">$</span>
                    npm install -g dialog
                  </code>
                  <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover/cmd:text-white group-hover/cmd:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-10 font-mono">
                  Then run: <span className="text-gray-300">dialog-cli start</span>  <span className="text-gray-600 mx-2">or</span>  <span className="text-gray-300">dialog-web start</span>
                </p>

                <button className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent1 to-accent2 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300" />
                  <div className="relative h-14 px-10 bg-gradient-to-r from-accent1 to-accent2 rounded-full flex items-center justify-center text-white font-semibold text-lg transition-transform active:scale-95 shadow-xl">
                    Get Started
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] bg-[#030304] pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          <div className="max-w-xs">
            <a href="#" className="flex items-center gap-2 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M4 7V17C4 19.2091 5.79086 21 8 21H16C18.2091 21 20 19.2091 20 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 7L12 3L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 11L12 15L20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-white font-bold tracking-tight text-lg">Dialog</span>
            </a>
            <p className="text-sm text-gray-500 leading-relaxed">
              Made for developers who ship fast. Stop grepping, start asking.
            </p>
          </div>

          <div className="flex flex-wrap gap-12 md:gap-20">
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Docs</a></li>
                <li><a href="#mcp" className="text-sm text-gray-500 hover:text-white transition-colors">MCP Setup</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">&copy; 2026 Dialog. All rights reserved.</p>

          <div className="flex items-center gap-5">
            {/* X/Twitter */}
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            {/* Discord */}
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
