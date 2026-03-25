import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Dialog — AI-Powered Log Analysis',
  description: 'Local-first AI-powered log analysis tool. Auto-attaches to your running project. Zero config. Ask questions in plain English.',
  openGraph: {
    title: 'Dialog — AI-Powered Log Analysis',
    description: 'Local-first AI-powered log analysis tool. Auto-attaches to your running project. Zero config.',
    url: 'https://dialog.dev',
    siteName: 'Dialog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dialog — AI-Powered Log Analysis',
    description: 'Local-first AI-powered log analysis tool. Zero config. Ask questions in plain English.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased overflow-x-hidden relative selection:bg-indigo-500/30`}>
        {children}
      </body>
    </html>
  );
}
