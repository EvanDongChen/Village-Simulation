import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DayRecord } from '../simulation/types';

interface Props {
  history: DayRecord[];
}

export default function PopulationChart({ history }: Props) {
  // Keep last 200 data points for readability
  const data = history.slice(-200).map(r => ({
    day: r.day,
    total: r.total,
    hawks: r.counts.hawk ?? 0,
    doves: r.counts.dove ?? 0,
  }));

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-2">
        Population Dynamics
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,74,57,0.12)" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#7e7064', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90,74,57,0.2)' }}
            label={{ value: 'Day', position: 'insideBottomRight', offset: 0, fill: '#8a7b6f', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: '#7e7064', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90,74,57,0.2)' }}
            allowDecimals={false}
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
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#7e7064' }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#4f7972"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="hawks"
            name="Hawks"
            stroke="#9a3f3a"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="doves"
            name="Doves"
            stroke="#3f7a74"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
