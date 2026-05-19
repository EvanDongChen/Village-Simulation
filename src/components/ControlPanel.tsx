import type { SimConfig, StrategyGroupConfig, StrategyTag } from '../simulation/types';
import { MAX_POPULATION } from '../simulation/constants';

const STRATEGY_LABELS: Record<StrategyTag, string> = { hawk: 'Hawk', dove: 'Dove' };

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

  const updateGroup = (idx: number, patch: Partial<StrategyGroupConfig>) => {
    const next = config.strategyGroups.map((g, i) => i === idx ? { ...g, ...patch } : g);
    onConfigChange({ strategyGroups: next });
  };

  const addGroup = () => {
    onConfigChange({
      strategyGroups: [
        ...config.strategyGroups,
        { strategy: 'dove', count: 5, speedMin: 60, speedMax: 140 },
      ],
    });
  };

  const removeGroup = (idx: number) => {
    if (config.strategyGroups.length <= 1) return;
    onConfigChange({ strategyGroups: config.strategyGroups.filter((_, i) => i !== idx) });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Playback controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {!running ? (
          <button
            onClick={onStart}
            className="flex-1 bg-[#8d433f] hover:bg-[#7f3a36] text-[#fbf8f2] text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 bg-[#9b7447] hover:bg-[#8d673d] text-[#fbf8f2] text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={onStep}
          disabled={running}
          className="flex-1 bg-[#4c756f] hover:bg-[#3f6761] disabled:opacity-40 text-[#fbf8f2] text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ⏭ Step
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-[#6b6158] hover:bg-[#5d544d] text-[#fbf8f2] text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Turbo toggle ──────────────────────────────────────────────────── */}
      <label className="flex items-center justify-between cursor-pointer select-none group">
        <span className="text-xs font-semibold text-[#6f6256] group-hover:text-[#2e241c] transition-colors uppercase tracking-[0.12em]">
          ⚡ Turbo Mode
        </span>
        <div
          onClick={() => onConfigChange({ turbo: !config.turbo })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            config.turbo ? 'bg-[#8d433f]' : 'bg-[#b0a497]'
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
        <p className="text-xs text-[#7e7064] -mt-2">
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

      <div className="border-t border-black/8 pt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em]">
            Starting Groups
          </p>
          <button
            onClick={addGroup}
            className="text-xs text-[#4c756f] hover:text-[#2e241c] font-semibold transition-colors"
          >
            + Add group
          </button>
        </div>

        {config.strategyGroups.map((g, i) => (
          <div
            key={i}
            className="rounded-lg border border-black/8 bg-[rgba(255,252,247,0.7)] px-3 pt-2 pb-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <select
                value={g.strategy}
                onChange={e => updateGroup(i, { strategy: e.target.value as StrategyTag })}
                className="text-xs font-semibold rounded-md border border-black/10 bg-transparent px-2 py-1 text-[#2e241c] cursor-pointer"
              >
                {(Object.keys(STRATEGY_LABELS) as StrategyTag[]).map(s => (
                  <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
                ))}
              </select>
              {config.strategyGroups.length > 1 && (
                <button
                  onClick={() => removeGroup(i)}
                  className="text-xs text-[#9a8d83] hover:text-[#8d433f] transition-colors font-bold leading-none"
                  title="Remove group"
                >
                  ×
                </button>
              )}
            </div>

            <SliderField
              label="Count"
              value={g.count}
              min={0} max={Math.min(150, MAX_POPULATION)} step={1}
              format={v => String(v)}
              onChange={v => updateGroup(i, { count: v })}
            />
            <SliderField
              label="Speed min"
              value={g.speedMin}
              min={20} max={400} step={5}
              format={v => `${v} px/s`}
              onChange={v => updateGroup(i, { speedMin: Math.min(v, g.speedMax) })}
            />
            <SliderField
              label="Speed max"
              value={g.speedMax}
              min={20} max={400} step={5}
              format={v => `${v} px/s`}
              onChange={v => updateGroup(i, { speedMax: Math.max(v, g.speedMin) })}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-black/8 pt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6f6256] uppercase tracking-[0.12em]">
            Food Pairs / Day
          </p>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#7e7064]">
            <input
              type="checkbox"
              checked={config.foodPairsOverride === null}
              onChange={e => onConfigChange({ foodPairsOverride: e.target.checked ? null : autoFood })}
              className="accent-[#4c756f] w-3 h-3"
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
      <div className="flex justify-between text-xs text-[#7e7064]">
        <span>{label}</span>
        <span className="mono text-[#2e241c]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#4c756f] h-1.5 rounded-full cursor-pointer"
      />
    </label>
  );
}
