import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DayRecord } from '../simulation/types';

interface Props {
  history: DayRecord[];
}

// Colours that align with the muted ruby/teal palette
const HAWK_BAND  = 'rgba(154, 63, 58, 0.14)';
const HAWK_LINE  = '#9a3f3a';
const DOVE_BAND  = 'rgba(63, 122, 116, 0.14)';
const DOVE_LINE  = '#3f7a74';

export default function SpeedChart({ history }: Props) {
  const data = history.slice(-200).map(r => ({
    day: r.day,
    // Hawk range represented as [min, max] pair for the Area
    hawkRange: r.minSpeeds.hawk != null && r.maxSpeeds.hawk != null
      ? [Math.round(r.minSpeeds.hawk), Math.round(r.maxSpeeds.hawk)]
      : null,
    hawkAvg: r.avgSpeeds.hawk != null ? Math.round(r.avgSpeeds.hawk) : null,
    // Dove
    doveRange: r.minSpeeds.dove != null && r.maxSpeeds.dove != null
      ? [Math.round(r.minSpeeds.dove), Math.round(r.maxSpeeds.dove)]
      : null,
    doveAvg: r.avgSpeeds.dove != null ? Math.round(r.avgSpeeds.dove) : null,
  }));

  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-2">
          Speed Evolution
        </h3>
        <p className="text-xs text-[#9a8d83] italic">Waiting for first day…</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-1">
        Speed Evolution
      </h3>
      <p className="text-[10px] text-[#9a8d83] mb-2">
        Shaded band = min–max range · Line = mean · Inherited ±10% per generation
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,74,57,0.12)" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#7e7064', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90,74,57,0.2)' }}
          />
          <YAxis
            tick={{ fill: '#7e7064', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90,74,57,0.2)' }}
            allowDecimals={false}
            unit=" px"
          />
          <Tooltip
            contentStyle={{
              background: '#f9f4eb',
              border: '1px solid rgba(90,74,57,0.2)',
              borderRadius: 8,
              color: '#2e241c',
              fontSize: 12,
            }}
            labelStyle={{ color: '#7e7064' }}
            formatter={(value: unknown, name: string) => {
              if (Array.isArray(value)) return [`${value[0]}–${value[1]} px/s`, name];
              return [`${value} px/s`, name];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#7e7064' }}
          />

          {/* ── Hawk range band ───────────────────────────────────────────── */}
          <Area
            type="monotone"
            dataKey="hawkRange"
            name="Hawk range"
            stroke="none"
            fill={HAWK_BAND}
            isAnimationActive={false}
            legendType="none"
            activeDot={false}
          />
          {/* ── Dove range band ───────────────────────────────────────────── */}
          <Area
            type="monotone"
            dataKey="doveRange"
            name="Dove range"
            stroke="none"
            fill={DOVE_BAND}
            isAnimationActive={false}
            legendType="none"
            activeDot={false}
          />

          {/* ── Mean speed lines ───────────────────────────────────────────── */}
          <Line
            type="monotone"
            dataKey="hawkAvg"
            name="Hawk avg"
            stroke={HAWK_LINE}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="doveAvg"
            name="Dove avg"
            stroke={DOVE_LINE}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
