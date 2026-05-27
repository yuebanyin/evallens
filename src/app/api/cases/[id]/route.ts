import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CaseSchema } from '@/lib/types';
import { deleteUserCase, getUserCase, saveUserCase } from '@/lib/store';

const CasePatchBody = z.object({
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

const CaseId = z.string().regex(/^case_custom_[a-z0-9]+_[a-z0-9]+$/i);

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } },
) {
  const idParsed = CaseId.safeParse(ctx.params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'Invalid custom case id.' }, { status: 400 });
  }

  const existing = await getUserCase(idParsed.data);
  if (!existing) {
    return NextResponse.json({ error: 'Custom case not found.' }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CasePatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nextCase = CaseSchema.parse({
    id: existing.id,
    ...parsed.data,
    title: parsed.data.title.trim(),
    prompt: parsed.data.prompt.trim(),
    expected: parsed.data.expected?.trim() || undefined,
    tags: existing.tags?.length ? existing.tags : ['custom', 'user'],
  });

  await saveUserCase(nextCase);
  return NextResponse.json({ case: nextCase }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } },
) {
  const idParsed = CaseId.safeParse(ctx.params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'Invalid custom case id.' }, { status: 400 });
  }

  const removed = await deleteUserCase(idParsed.data);
  if (!removed) {
    return NextResponse.json({ error: 'Custom case not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
