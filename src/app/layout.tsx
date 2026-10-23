import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'All-in-One AI Hub | OpenAI, Claude & Gemini',
  description: 'A unified workspace to prompt, test, and compare models from OpenAI, Anthropic Claude, and Google Gemini side-by-side.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
