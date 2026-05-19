import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        panel: '#11141b',
        border: '#1f2430',
        muted: '#8a93a6',
        fg: '#e6e9ef',
        accent: '#7c5cff',
        accent2: '#22d3ee',
        ok: '#10b981',
        warn: '#f59e0b',
        err: '#ef4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
