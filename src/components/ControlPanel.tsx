import type { SimConfig } from '../simulation/types';
import { MAX_POPULATION } from '../simulation/constants';

interface Props {
  config: SimConfig;
  running: boolean;
  population: number;
  onStart: () => void;
  onPause: () => void;
  onStep:  () => void;
  onReset: () => void;
  onConfigChange: (patch: Partial<SimConfig>) => void;
}

export default function ControlPanel({
  config,
  running,
  population,
  onStart,
  onPause,
  onStep,
  onReset,
  onConfigChange,
}: Props) {
  const autoFood = Math.max(1, Math.floor(population / 2));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Playback controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {!running ? (
          <button
            onClick={onStart}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={onStep}
          disabled={running}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ⏭ Step
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Turbo toggle ──────────────────────────────────────────────────── */}
      <label className="flex items-center justify-between cursor-pointer select-none group">
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
          ⚡ Turbo Mode
        </span>
        <div
          onClick={() => onConfigChange({ turbo: !config.turbo })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            config.turbo ? 'bg-violet-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
              config.turbo ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </label>
      {config.turbo && (
        <p className="text-xs text-slate-500 -mt-2">
          Animation skipped — days resolve as fast as possible.
        </p>
      )}

      {/* ── Speed slider (only meaningful when not turbo) ─────────────────── */}
      {!config.turbo && (
        <SliderField
          label="Sim Speed"
          value={config.simSpeed}
          min={0.5} max={20} step={0.5}
          format={v => `${v}×`}
          onChange={v => onConfigChange({ simSpeed: v })}
        />
      )}

      <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Initial Population
        </p>
        <SliderField
          label="🔴 Hawks"
          value={config.initialHawks}
          min={0} max={Math.min(150, MAX_POPULATION)} step={1}
          format={v => `${v}`}
          onChange={v => onConfigChange({ initialHawks: v })}
        />
        <SliderField
          label="🔵 Doves"
          value={config.initialDoves}
          min={0} max={Math.min(150, MAX_POPULATION)} step={1}
          format={v => `${v}`}
          onChange={v => onConfigChange({ initialDoves: v })}
        />
      </div>

      <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Food Pairs / Day
          </p>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
            <input
              type="checkbox"
              checked={config.foodPairsOverride === null}
              onChange={e => onConfigChange({ foodPairsOverride: e.target.checked ? null : autoFood })}
              className="accent-violet-500 w-3 h-3"
            />
            Auto ({autoFood})
          </label>
        </div>
        {config.foodPairsOverride !== null && (
          <SliderField
            label="Pairs"
            value={config.foodPairsOverride}
            min={1} max={150} step={1}
            format={v => `${v}`}
            onChange={v => onConfigChange({ foodPairsOverride: v })}
          />
        )}
      </div>
    </div>
  );
}

// ─── Reusable slider row ──────────────────────────────────────────────────────
function SliderField({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-violet-500 h-1.5 rounded-full cursor-pointer"
      />
    </label>
  );
}
