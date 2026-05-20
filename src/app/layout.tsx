import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EvalLens — Local-first LLM benchmark playground',
  description:
    'Run, compare and audit LLM behavior on your own tasks. Local-first. No ML background required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="glow absolute inset-x-0 top-0 h-[400px] pointer-events-none" />
        <header className="relative border-b border-border bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2 text-fg">
              <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-accent to-accent2" />
              <span className="font-semibold tracking-tight">EvalLens</span>
              <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                local-first
              </span>
            </a>
            <nav className="text-sm text-muted">
              <a
                href="https://github.com/yuebanyin/evallens"
                className="hover:text-fg"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-20 border-t border-border py-6 text-center text-xs text-muted">
          <span>
            Built with <span aria-hidden>❤️</span> by{' '}
            <a
              href="https://github.com/yuebanyin"
              target="_blank"
              rel="noreferrer"
              className="text-fg hover:text-accent"
            >
              @yuebanyin
            </a>
            {' · '}
            <a
              href="https://github.com/yuebanyin/evallens"
              target="_blank"
              rel="noreferrer"
              className="hover:text-fg"
            >
              Source on GitHub
            </a>
            {' · MIT License'}
          </span>
        </footer>
      </body>
    </html>
  );
}
