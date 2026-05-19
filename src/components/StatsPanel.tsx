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
      <StatCard label="Day" value={String(day)} accent="text-[#4f7972]" />
      <StatCard label="Population" value={String(total)} accent="text-[#2e241c]" />
      <StatCard
        label="Hawks"
        value={`${hawks}`}
        sub={`${hawkPct}%`}
        accent="text-[#9a3f3a]"
      />
      <StatCard
        label="Doves"
        value={`${doves}`}
        sub={`${dovePct}%`}
        accent="text-[#3f7a74]"
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
    <div className="rounded-lg px-3 py-2 border border-[#cabfb2] bg-[rgba(255,252,247,0.88)]">
      <p className="text-xs text-[#7e7064] uppercase tracking-[0.12em] leading-none mb-1">{label}</p>
      <p className={`text-xl font-bold leading-none ${accent}`}>
        {value}
        {sub && <span className="text-xs font-normal text-[#7e7064] ml-1">{sub}</span>}
      </p>
    </div>
  );
}

function PhaseBar({ phase }: { phase: string }) {
  const phases = ['idle', 'spawning', 'foraging', 'resolution', 'returning', 'evolving'] as const;
  const labels: Record<string, string> = {
    idle: 'Idle',
    spawning: 'Spawn',
    foraging: 'Forage',
    resolution: 'Resolve',
    returning: 'Return',
    evolving: 'Evolve',
  };

  return (
    <div className="flex gap-1 items-center">
      {phases.map(p => (
        <div
          key={p}
          className={`flex-1 text-center text-[9px] font-semibold py-1 rounded transition-colors uppercase tracking-[0.08em] ${
            phase === p
              ? 'bg-[#8d433f] text-[#fbf8f2]'
              : 'bg-[rgba(241,233,223,0.9)] text-[#8b7f73]'
          }`}
        >
          {labels[p]}
        </div>
      ))}
    </div>
  );
}
