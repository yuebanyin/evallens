'use client';

import {
  Radar,
  RadarChart as RChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const PALETTE = ['#7c5cff', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#a78bfa'];

interface Props {
  data: Array<Record<string, string | number>>;
  keys: string[];
}

export function RadarChart({ data, keys }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RChart data={data} outerRadius="75%">
        <PolarGrid stroke="#1f2430" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#8a93a6', fontSize: 11 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={{ fill: '#8a93a6', fontSize: 10 }}
          stroke="#1f2430"
        />
        {keys.map((k, i) => (
          <Radar
            key={k}
            name={k}
            dataKey={k}
            stroke={PALETTE[i % PALETTE.length]}
            fill={PALETTE[i % PALETTE.length]}
            fillOpacity={0.18}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 11, color: '#8a93a6' }} />
        <Tooltip
          contentStyle={{
            background: '#11141b',
            border: '1px solid #1f2430',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e6e9ef' }}
        />
      </RChart>
    </ResponsiveContainer>
  );
}
