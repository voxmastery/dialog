import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dialog | AI-Powered Log Analysis',
  description:
    'AI-powered log analysis that auto-attaches to your running project. Zero config. Zero cost. Ask questions in plain English.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased overflow-x-hidden relative selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
