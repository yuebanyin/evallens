import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCase, newRunId, saveRun } from '@/lib/store';
import { availableProviders, runProviders } from '@/lib/providers';
import { checkCase } from '@/lib/sanity-check';
import type { Run } from '@/lib/types';

const Body = z.object({
  caseId: z.string(),
  /** Optional explicit provider list; defaults to all available. */
  providers: z
    .array(z.object({ id: z.enum(['openai', 'anthropic', 'mock']), model: z.string() }))
    .optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const c = getCase(parsed.data.caseId);
  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Build gate
  const build = checkCase(c);
  if (!build.passed) {
    return NextResponse.json(
      { error: 'Case failed Build gate', reasons: build.reasons },
      { status: 422 },
    );
  }

  const providers = parsed.data.providers ?? availableProviders();
  const started = new Date().toISOString();
  const results = await runProviders({ case: c, providers });

  const run: Run = {
    id: newRunId(),
    caseId: c.id,
    caseSnapshot: c,
    startedAt: started,
    finishedAt: new Date().toISOString(),
    results,
  };
  await saveRun(run);

  return NextResponse.json({ runId: run.id });
}
