import { useCallback } from 'react';
import { useSimulation } from './hooks/useSimulation';
import SimulationCanvas from './components/SimulationCanvas';
import PopulationChart from './components/PopulationChart';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import type { SimConfig } from './simulation/types';

export default function App() {
  const { renderState, config, start, pause, step, reset, setConfig } = useSimulation();

  const handleReset = useCallback(() => reset(config), [reset, config]);

  const handleConfigChange = useCallback(
    (patch: Partial<SimConfig>) => {
      setConfig(patch);
    },
    [setConfig],
  );

  const population = renderState.agents.filter(a => a.alive).length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        <h1 className="text-sm font-bold tracking-widest uppercase text-slate-200">
          Hawk-Dove Evolution Simulator
        </h1>
        <span className="ml-auto text-xs text-slate-500">
          Evolutionary Game Theory · Hawk-Dove Model
        </span>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden w-full">
        {/* Canvas — fixed world width */}
        <div className="flex items-start justify-center p-4 flex-shrink-0">
          <SimulationCanvas renderState={renderState} />
        </div>

        {/* Sidebar — fills all remaining space */}
        <aside
          className="flex flex-col gap-4 p-4 border-l border-white/10 overflow-y-auto flex-1 min-w-0"
          style={{ minWidth: 300 }}
        >
          {/* Stats */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Live Stats
            </h2>
            <StatsPanel renderState={renderState} />
          </section>

          {/* Controls */}
          <section className="border-t border-white/10 pt-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Controls
            </h2>
            <ControlPanel
              config={config}
              running={renderState.running}
              population={population}
              onStart={start}
              onPause={pause}
              onStep={step}
              onReset={handleReset}
              onConfigChange={handleConfigChange}
            />
          </section>

          {/* Chart */}
          <section className="border-t border-white/10 pt-4 flex-1">
            <PopulationChart history={renderState.history} />
          </section>

          {/* Payoff legend */}
          <section className="border-t border-white/10 pt-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Payoff Matrix
            </h2>
            <div className="text-xs text-slate-400 space-y-1 font-mono">
              <PayoffRow label="Uncontested"  value="+2.0" color="text-violet-400" />
              <PayoffRow label="Dove vs Dove" value="+1.0 each" color="text-blue-400" />
              <PayoffRow label="Hawk vs Dove" value="H +1.5 / D +0.5" color="text-orange-400" />
              <PayoffRow label="Hawk vs Hawk" value="0 each (fight)" color="text-red-400" />
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function PayoffRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

