'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProviderId } from '@/lib/types';

export interface ProviderOption {
  id: ProviderId;
  model: string;
}

interface Props {
  caseId: string;
  providers: ProviderOption[];
  /** 默认勾上的项，格式是 "id/model"，例如 "openai/gpt-4o"。 */
  defaultSelected: string[];
}

function providerKey(p: ProviderOption) {
  return `${p.id}/${p.model}`;
}

export function RunPanel({ caseId, providers, defaultSelected }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const [loading, setLoading] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onRun() {
    if (selected.size === 0) {
      alert('Pick at least one model to run.');
      return;
    }
    setLoading(true);
    try {
      const chosen = providers.filter((p) => selected.has(providerKey(p)));
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, providers: chosen }),
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
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-muted">models</span>
      {providers.map((p) => {
        const key = providerKey(p);
        const active = selected.has(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            disabled={loading}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition disabled:opacity-50 ${
              active
                ? 'border-accent/60 bg-accent/15 text-accent'
                : 'border-border bg-bg text-muted hover:text-fg'
            }`}
          >
            <span className="opacity-70">{p.id}</span>
            <span className="mx-1 opacity-40">/</span>
            <span>{p.model}</span>
          </button>
        );
      })}
      <div className="ml-auto">
        <button
          type="button"
          onClick={onRun}
          disabled={loading || selected.size === 0}
          className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
        >
          {loading ? 'Running…' : `Run ${selected.size > 0 ? `(${selected.size})` : ''} ▸`}
        </button>
      </div>
    </div>
  );
}
