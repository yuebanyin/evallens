import { NextResponse } from 'next/server';
import { getRun } from '@/lib/store';
import { toMarkdown } from '@/lib/export/markdown';
import { toHtml } from '@/lib/export/html';

/**
 * 导出某个 run 为 Markdown 或自包含 HTML。
 *  - GET /api/runs/<id>/export?format=md
 *  - GET /api/runs/<id>/export?format=html
 *
 * 用 Content-Disposition: attachment 触发下载，文件名包含 run id，方便归档。
 */
export async function GET(
  req: Request,
  ctx: { params: { id: string } },
) {
  const run = await getRun(ctx.params.id);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const format = (new URL(req.url).searchParams.get('format') || 'md').toLowerCase();
  const safeId = run.id.replace(/[^a-z0-9_-]/gi, '_');

  if (format === 'html') {
    const body = toHtml(run);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="evallens-${safeId}.html"`,
      },
    });
  }

  if (format === 'md' || format === 'markdown') {
    const body = toMarkdown(run);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="evallens-${safeId}.md"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format. Use md or html.' }, { status: 400 });
}
