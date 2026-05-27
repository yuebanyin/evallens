'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import type { Case } from '@/lib/types';

const DIMENSIONS = ['ui', 'bug', 'feature', 'doc', 'security', 'custom'] as const;
const OUTPUT_SCHEMAS = ['text', 'json', 'code'] as const;

type Dimension = (typeof DIMENSIONS)[number];
type OutputSchema = (typeof OUTPUT_SCHEMAS)[number];

const CaseFormSchema = z.object({
  title: z.string().trim().min(1),
  dimension: z.enum(['ui', 'bug', 'feature', 'doc', 'security', 'custom']),
  prompt: z.string().trim().min(1),
  expected: z.string().optional(),
  outputSchema: z.enum(['text', 'json', 'code']),
  constraints: z
    .object({
      maxChars: z.number().int().positive().optional(),
      mustContain: z.array(z.string()).optional(),
      mustNotContain: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
});

export function CustomCaseActions({ c }: { c: Case }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(c.title);
  const [dimension, setDimension] = useState<Dimension>(c.dimension);
  const [prompt, setPrompt] = useState(c.prompt);
  const [expected, setExpected] = useState(c.expected ?? '');
  const [outputSchema, setOutputSchema] = useState<OutputSchema>(c.outputSchema);
  const [maxChars, setMaxChars] = useState(
    c.constraints?.maxChars ? String(c.constraints.maxChars) : '',
  );
  const [mustContain, setMustContain] = useState((c.constraints?.mustContain ?? []).join('\n'));
  const [mustNotContain, setMustNotContain] = useState((c.constraints?.mustNotContain ?? []).join('\n'));

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const draftConstraints: {
      maxChars?: number;
      mustContain?: string[];
      mustNotContain?: string[];
    } = {};

    const includeTokens = splitLines(mustContain);
    const excludeTokens = splitLines(mustNotContain);

    if (maxChars.trim()) draftConstraints.maxChars = Number(maxChars);
    if (includeTokens.length > 0) draftConstraints.mustContain = includeTokens;
    if (excludeTokens.length > 0) draftConstraints.mustNotContain = excludeTokens;

    const parsed = CaseFormSchema.safeParse({
      title,
      dimension,
      prompt,
      expected: expected || undefined,
      outputSchema,
      constraints: Object.keys(draftConstraints).length ? draftConstraints : undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(' | '));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || 'Update failed');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const ok = confirm('Delete this custom case? This cannot be undone.');
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || 'Delete failed');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(true)}
          className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted hover:text-fg disabled:opacity-60"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded border border-warn/40 px-2 py-1 text-[10px] uppercase tracking-wider text-warn hover:bg-warn/10 disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit custom case</h3>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-fg"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={onSave}>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Dimension</span>
                  <select
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value as Dimension)}
                    className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                  >
                    {DIMENSIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-muted">Output schema</span>
                  <select
                    value={outputSchema}
                    onChange={(e) => setOutputSchema(e.target.value as OutputSchema)}
                    className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                  >
                    {OUTPUT_SCHEMAS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-muted">Prompt</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                  rows={6}
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-muted">Expected (optional)</span>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                />
              </label>

              <div className="rounded-lg border border-border bg-bg p-3">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">Constraints (optional)</p>
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted">maxChars</span>
                    <input
                      type="number"
                      min={1}
                      value={maxChars}
                      onChange={(e) => setMaxChars(e.target.value)}
                      className="w-full rounded border border-border bg-panel px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted">mustContain (one token per line)</span>
                    <textarea
                      value={mustContain}
                      onChange={(e) => setMustContain(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-panel px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted">mustNotContain (one token per line)</span>
                    <textarea
                      value={mustNotContain}
                      onChange={(e) => setMustNotContain(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-panel px-3 py-2 text-sm outline-none ring-accent/40 focus:ring"
                    />
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded border border-err/30 bg-err/10 p-2 text-xs text-err">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded border border-border px-3 py-2 text-xs text-muted hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent disabled:opacity-60"
                >
                  {busy ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
