'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

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

export function CreateCaseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<Dimension>('custom');
  const [prompt, setPrompt] = useState('');
  const [expected, setExpected] = useState('');
  const [outputSchema, setOutputSchema] = useState<OutputSchema>('text');
  const [maxChars, setMaxChars] = useState('');
  const [mustContain, setMustContain] = useState('');
  const [mustNotContain, setMustNotContain] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const mustContainTokens = splitLines(mustContain);
    const mustNotContainTokens = splitLines(mustNotContain);

    const constraints: {
      maxChars?: number;
      mustContain?: string[];
      mustNotContain?: string[];
    } = {};

    if (maxChars.trim()) constraints.maxChars = Number(maxChars);
    if (mustContainTokens.length > 0) constraints.mustContain = mustContainTokens;
    if (mustNotContainTokens.length > 0) constraints.mustNotContain = mustNotContainTokens;

    const parsed = CaseFormSchema.safeParse({
      title,
      dimension,
      prompt,
      expected: expected || undefined,
      outputSchema,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(' | '));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.text();
        setError(body || 'Create case failed');
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDimension('custom');
    setPrompt('');
    setExpected('');
    setOutputSchema('text');
    setMaxChars('');
    setMustContain('');
    setMustNotContain('');
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
      >
        + New Case
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create a custom case</h3>
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

            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                  placeholder="e.g. JSON spec extraction from support ticket"
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
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                  placeholder="Describe the task and acceptance expectations"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-muted">Expected (optional)</span>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                  placeholder="Reference answer or scoring hint"
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
                      placeholder="e.g. 1200"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted">mustContain (one token per line)</span>
                    <textarea
                      value={mustContain}
                      onChange={(e) => setMustContain(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-panel px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                      placeholder="token A\ntoken B"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted">mustNotContain (one token per line)</span>
                    <textarea
                      value={mustNotContain}
                      onChange={(e) => setMustNotContain(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-panel px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring"
                      placeholder="forbidden A\nforbidden B"
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
                  disabled={loading}
                  className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Create Case'}
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
