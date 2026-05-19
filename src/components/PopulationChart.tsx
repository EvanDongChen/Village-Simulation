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
  const data = history.slice(-200);

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Population Dynamics
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            label={{ value: 'Day', position: 'insideBottomRight', offset: 0, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1e2330',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="hawks"
            name="Hawks"
            stroke="#f87171"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="doves"
            name="Doves"
            stroke="#60a5fa"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
