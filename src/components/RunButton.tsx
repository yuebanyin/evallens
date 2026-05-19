'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRun() {
    setLoading(true);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(`Run failed: ${t}`);
        return;
      }
      const data = (await res.json()) as { runId: string };
      router.push(`/runs/${data.runId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onRun}
      disabled={loading}
      className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
    >
      {loading ? 'Running…' : 'Run ▸'}
    </button>
  );
}
