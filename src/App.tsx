import { useCallback } from 'react';
import { useSimulation } from './hooks/useSimulation';
import SimulationCanvas from './components/SimulationCanvas';
import PopulationChart from './components/PopulationChart';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import SpeedChart from './components/SpeedChart';
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
    <div className="min-h-screen text-[#2e241c] flex flex-col relative overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="mx-4 mt-4 mb-2 px-5 py-3 flex items-center gap-3 panel rounded-2xl rise-in">
        <div className="w-2.5 h-2.5 rounded-full bg-[#8a413c]" />
        <h1 className="text-sm font-bold tracking-[0.12em] uppercase text-[#2e241c]">
          Hawk-Dove Evolution Simulator
        </h1>
        <span className="ml-auto text-xs text-[#6f6256] mono">
          Evolutionary Game Theory · Hawk-Dove Model
        </span>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden w-full px-4 pb-4 gap-4 flex-col xl:flex-row">
        {/* Canvas — fixed world width */}
        <div className="flex items-start justify-start xl:justify-center p-3 panel rounded-2xl flex-shrink-0 rise-in overflow-x-auto">
          <SimulationCanvas renderState={renderState} />
        </div>

        {/* Sidebar — fills all remaining space */}
        <aside
          className="panel rounded-2xl flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-w-0 rise-in"
          style={{ minWidth: 300 }}
        >
          {/* Stats */}
          <section>
            <h2 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-2">
              Live Stats
            </h2>
            <StatsPanel renderState={renderState} />
          </section>

          {/* Controls */}
          <section className="border-t border-white/10 pt-4">
            <h2 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-3">
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
          <section className="border-t border-white/10 pt-4">
            <PopulationChart history={renderState.history} />
          </section>

          {/* Speed chart */}
          <section className="border-t border-black/8 pt-4">
            <SpeedChart history={renderState.history} />
          </section>

          {/* Payoff legend */}
          <section className="border-t border-white/10 pt-3">
            <h2 className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em] mb-2">
              Payoff Matrix
            </h2>
            <div className="text-xs text-[#6f6256] space-y-1 mono">
              <PayoffRow label="Uncontested" value="+2.0" color="text-[#4f7972]" />
              <PayoffRow label="Dove vs Dove" value="+1.0 each" color="text-[#3f7a74]" />
              <PayoffRow label="Hawk vs Dove" value="H +1.5 / D +0.5" color="text-[#8a6a42]" />
              <PayoffRow label="Hawk vs Hawk" value="0 each (fight)" color="text-[#9a3f3a]" />
            </div>
          </section>

          <footer className="border-t border-black/8 pt-3 text-[11px] text-[#7e7064] leading-relaxed">
            <p>
              Simulation inspired by the YouTube video{' '}
              <a
                href="https://www.youtube.com/watch?v=YNMkADpvO4w&t=248s"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#4c756f] hover:text-[#2e241c] underline underline-offset-2"
              >
                https://www.youtube.com/watch?v=YNMkADpvO4w&t=248s
              </a>
              .
            </p>
          </footer>
        </aside>
      </main>
    </div>
  );
}

function PayoffRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#7e7064]">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

