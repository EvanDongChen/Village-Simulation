import type { RenderState } from '../hooks/useSimulation';

interface Props {
  renderState: RenderState;
}

export default function StatsPanel({ renderState }: Props) {
  const { day, agents, phase } = renderState;
  const total = agents.filter(a => a.alive).length;
  const hawks = agents.filter(a => a.alive && a.strategies[0] === 'hawk').length;
  const doves = total - hawks;
  const hawkPct = total > 0 ? Math.round((hawks / total) * 100) : 0;
  const dovePct = total > 0 ? Math.round((doves / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard label="Day" value={String(day)} accent="text-violet-400" />
      <StatCard label="Population" value={String(total)} accent="text-white" />
      <StatCard
        label="Hawks"
        value={`${hawks}`}
        sub={`${hawkPct}%`}
        accent="text-red-400"
      />
      <StatCard
        label="Doves"
        value={`${doves}`}
        sub={`${dovePct}%`}
        accent="text-blue-400"
      />
      <div className="col-span-2">
        <PhaseBar phase={phase} />
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-lg px-3 py-2 border border-white/5">
      <p className="text-xs text-slate-500 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className={`text-xl font-bold leading-none ${accent}`}>
        {value}
        {sub && <span className="text-xs font-normal text-slate-400 ml-1">{sub}</span>}
      </p>
    </div>
  );
}

function PhaseBar({ phase }: { phase: string }) {
  const phases = ['idle', 'spawning', 'foraging', 'resolution', 'evolving'] as const;
  const labels: Record<string, string> = {
    idle: 'Idle',
    spawning: 'Spawn',
    foraging: 'Forage',
    resolution: 'Resolve',
    evolving: 'Evolve',
  };

  return (
    <div className="flex gap-1 items-center">
      {phases.map(p => (
        <div
          key={p}
          className={`flex-1 text-center text-[9px] font-semibold py-1 rounded transition-colors ${
            phase === p
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-slate-600'
          }`}
        >
          {labels[p]}
        </div>
      ))}
    </div>
  );
}
