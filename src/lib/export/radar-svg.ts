import type { RubricDimension } from '../types';

/**
 * 服务端可渲染的雷达图 SVG。
 * 不依赖 recharts —— 导出报告必须是自包含的，不能再跑客户端 JS。
 *
 * - 起点放在最上方 (-π/2)，顺时针排列，跟客户端的 RadarChart 视觉一致。
 * - 同心环：score 1..5 各画一圈，最外圈对应 5 分。
 * - 每个模型一条多边形 + 描边色，半透明填充，方便重叠时看清。
 */

export interface RadarSeries {
  /** 图例标签，例如 "openai/gpt-4o"。 */
  name: string;
  /** dimension.key → 0..5 分数。 */
  scores: Record<string, number>;
}

interface Options {
  dims: RubricDimension[];
  series: RadarSeries[];
  /** 调色板，按 series 顺序循环。 */
  palette?: string[];
  /** 整体宽/高（正方形最稳）。 */
  size?: number;
}

const DEFAULT_PALETTE = ['#7c5cff', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#a78bfa'];

export function radarSvg(opts: Options): string {
  const size = opts.size ?? 520;
  const palette = opts.palette ?? DEFAULT_PALETTE;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;

  const n = opts.dims.length;
  const angles = Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);

  // 轴线 + 标签
  const axes: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = angles[i];
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    axes.push(
      `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#cbd5e1" stroke-width="1" />`,
    );
    const lx = cx + (R + 22) * Math.cos(a);
    const ly = cy + (R + 22) * Math.sin(a);
    const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
    axes.push(
      `<text x="${lx.toFixed(2)}" y="${(ly + 4).toFixed(2)}" text-anchor="${anchor}" font-size="11" fill="#475569">${escapeXml(opts.dims[i].label)}</text>`,
    );
  }

  // 同心环
  const rings: string[] = [];
  for (let r = 1; r <= 5; r++) {
    const points = anglePolygon(angles, cx, cy, (R * r) / 5);
    rings.push(
      `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1" />`,
    );
  }
  // 5 分外圈描深一点
  rings.push(
    `<polygon points="${anglePolygon(angles, cx, cy, R)}" fill="none" stroke="#94a3b8" stroke-width="1" />`,
  );

  // 数据多边形
  const dataPolys: string[] = [];
  opts.series.forEach((s, idx) => {
    const color = palette[idx % palette.length];
    const points = opts.dims
      .map((d, i) => {
        const raw = s.scores[d.key];
        const v = typeof raw === 'number' ? Math.max(0, Math.min(5, raw)) : 0;
        const r = (R * v) / 5;
        const x = cx + r * Math.cos(angles[i]);
        const y = cy + r * Math.sin(angles[i]);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    dataPolys.push(
      `<polygon points="${points}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2" />`,
    );
  });

  // 图例
  const legend: string[] = [];
  const legendX = 16;
  let legendY = size - 12 - opts.series.length * 18;
  opts.series.forEach((s, idx) => {
    const color = palette[idx % palette.length];
    legend.push(
      `<rect x="${legendX}" y="${legendY - 10}" width="12" height="12" rx="2" fill="${color}" fill-opacity="0.6" stroke="${color}" />`,
      `<text x="${legendX + 18}" y="${legendY}" font-size="11" fill="#1f2937">${escapeXml(s.name)}</text>`,
    );
    legendY += 18;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">`,
    `<rect width="${size}" height="${size}" fill="white" />`,
    rings.join(''),
    axes.join(''),
    dataPolys.join(''),
    legend.join(''),
    '</svg>',
  ].join('');
}

function anglePolygon(angles: number[], cx: number, cy: number, r: number): string {
  return angles
    .map((a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
    .join(' ');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
