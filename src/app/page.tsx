import Link from 'next/link';
import { listCases, listRuns } from '@/lib/store';
import { availableProviders } from '@/lib/providers';
import { RunPanel } from '@/components/RunPanel';
import { formatUtcDateTime } from '@/lib/format';

export default async function HomePage() {
  const cases = listCases();
  const providers = availableProviders();
  const recentRuns = (await listRuns()).slice(0, 5);
  const hasRealKeys = providers.some((p) => p.id !== 'mock');

  // Default selection: prefer real providers when keys are configured,
  // otherwise default to a single mock so the demo "just works".
  const defaultSelected = (hasRealKeys
    ? providers.filter((p) => p.id !== 'mock')
    : providers.filter((p) => p.model === 'mock-fast')
  ).map((p) => `${p.id}/${p.model}`);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Compare LLMs on <span className="text-accent">your</span> real tasks.
        </h1>
        <p className="max-w-2xl text-muted">
          EvalLens is a local-first benchmark playground. Pick a case, fan it out to multiple
          models, get a side-by-side report with a 5-axis radar — no ML background required.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <Badge tone="ok">Sanity-check gate ✓</Badge>
          <Badge tone="accent">5-Dim Rubric</Badge>
          <Badge>{providers.length} providers ready</Badge>
          {!hasRealKeys && <Badge tone="warn">Mock mode (no API keys)</Badge>}
        </div>
      </section>

      {/* Cases */}
      <section>
        <SectionTitle title="Seed cases" hint="Pick models, then hit Run" />
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-border bg-panel p-5 transition hover:border-accent/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{c.title}</h3>
                  <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                    <span className="rounded bg-bg px-1.5 py-0.5">{c.dimension}</span>
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-bg px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{c.prompt}</p>
              <RunPanel
                caseId={c.id}
                providers={providers}
                defaultSelected={defaultSelected}
              />
            </article>
          ))}
        </div>
      </section>

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <section>
          <SectionTitle title="Recent runs" hint="Click to open compare view" />
          <ul className="divide-y divide-border rounded-xl border border-border bg-panel">
            {recentRuns.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/runs/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-bg"
                >
                  <span className="text-sm">{r.caseSnapshot.title}</span>
                  <span className="text-xs text-muted">
                    {r.results.length} models · {formatUtcDateTime(r.startedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'accent';
}) {
  const palette = {
    default: 'bg-bg text-muted border-border',
    ok: 'bg-ok/10 text-ok border-ok/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
    accent: 'bg-accent/10 text-accent border-accent/30',
  }[tone];
  return (
    <span className={`rounded-full border px-2.5 py-1 ${palette}`}>{children}</span>
  );
}
