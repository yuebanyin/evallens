import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CaseSchema } from '@/lib/types';
import { listCases, newCaseId, saveUserCase } from '@/lib/store';

const CreateCaseBody = z.object({
  title: z.string().min(1),
  dimension: z.enum(['ui', 'bug', 'feature', 'doc', 'security', 'custom']),
  prompt: z.string().min(1),
  expected: z.string().optional(),
  outputSchema: z.enum(['text', 'json', 'code']).default('text'),
  constraints: z
    .object({
      maxChars: z.number().int().positive().optional(),
      mustContain: z.array(z.string()).optional(),
      mustNotContain: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateCaseBody.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const newCase = CaseSchema.parse({
    id: newCaseId(),
    ...parsed.data,
    title: parsed.data.title.trim(),
    prompt: parsed.data.prompt.trim(),
    expected: parsed.data.expected?.trim() || undefined,
    tags: ['custom', 'user'],
  });

  const idTaken = listCases().some((c) => c.id === newCase.id);
  if (idTaken) {
    return NextResponse.json({ error: 'Case ID collision, please retry.' }, { status: 409 });
  }

  await saveUserCase(newCase);
  return NextResponse.json({ case: newCase }, { status: 201 });
}
