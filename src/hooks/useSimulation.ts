import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Agent, DayRecord, FoodPair, SimConfig, SimulationState, StrategyTag } from '../simulation/types';
import { DEFAULT_CONFIG, PHASE_DURATIONS } from '../simulation/constants';
import {
  createAgent,
  spawnFood,
  assignFood,
  resolveEncounters,
  evaluateSurvival,
  layoutVillageHomes,
} from '../simulation/engine';

// ─── Interpolated render positions ────────────────────────────────────────────
export interface RenderAgent {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  strategies: Agent['strategies'];
  speed: number;
  food: number;
  alive: boolean;
  // 0–1: how far along the day's move this agent is
  moveProgress: number;
}

export interface RenderState {
  agents: RenderAgent[];
  foodPairs: FoodPair[];
  day: number;
  phase: SimulationState['phase'];
  history: SimulationState['history'];
  running: boolean;
  config: SimConfig;
}

// ─── Build initial agent list ─────────────────────────────────────────────────
function buildInitialAgents(cfg: SimConfig): Agent[] {
  const agents: Agent[] = [];
  for (const group of cfg.strategyGroups) {
    for (let i = 0; i < group.count; i++) {
      const speed = group.speedMin + Math.random() * (group.speedMax - group.speedMin);
      agents.push(createAgent(group.strategy, speed));
    }
  }
  layoutVillageHomes(agents, true);
  return agents;
}

// ─── Build a DayRecord from a live agent list ─────────────────────────────────
function buildDayRecord(day: number, agents: Agent[]): DayRecord {
  const counts: Partial<Record<StrategyTag, number>> = {};
  const speedSums: Partial<Record<StrategyTag, number>> = {};
  const minSpeeds: Partial<Record<StrategyTag, number>> = {};
  const maxSpeeds: Partial<Record<StrategyTag, number>> = {};

  for (const a of agents) {
    const s = a.strategies[0];
    counts[s]    = (counts[s]    ?? 0) + 1;
    speedSums[s] = (speedSums[s] ?? 0) + a.speed;
    minSpeeds[s] = Math.min(minSpeeds[s] ?? Infinity, a.speed);
    maxSpeeds[s] = Math.max(maxSpeeds[s] ?? -Infinity, a.speed);
  }

  const avgSpeeds: Partial<Record<StrategyTag, number>> = {};
  for (const s of Object.keys(counts) as StrategyTag[]) {
    avgSpeeds[s] = speedSums[s]! / counts[s]!;
  }

  return { day, total: agents.length, counts, avgSpeeds, minSpeeds, maxSpeeds };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSimulation() {
  const [config, setConfigState] = useState<SimConfig>(DEFAULT_CONFIG);

  // Mutable simulation state (not directly rendered – avoids stale closures)
  const stateRef = useRef<SimulationState>({
    agents: buildInitialAgents(DEFAULT_CONFIG),
    foodPairs: [],
    day: 0,
    phase: 'idle',
    history: [],
    running: false,
  });

  // Agent start positions for lerp (set at beginning of foraging phase)
  const startPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Target positions (the assigned food pair coords)
  const targetPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // What gets rendered
  const [renderState, setRenderState] = useState<RenderState>(() => ({
    agents: stateRef.current.agents.map(a => ({ ...a, moveProgress: 0 })),
    foodPairs: [],
    day: 0,
    phase: 'idle',
    history: [],
    running: false,
    config: DEFAULT_CONFIG,
  }));

  const rafRef = useRef<number>(0);
  const phaseStartRef = useRef<number>(0);
  const configRef = useRef<SimConfig>(DEFAULT_CONFIG);

  // Keep configRef in sync
  useEffect(() => { configRef.current = config; }, [config]);

  // ─── Push render state ─────────────────────────────────────────────────────
  const pushRender = useCallback((overrides?: Partial<RenderState>) => {
    const s = stateRef.current;
    setRenderState(prev => ({
      ...prev,
      agents: s.agents.map(a => ({
        ...a,
        moveProgress: 0,
      } satisfies RenderAgent)),
      foodPairs: s.foodPairs,
      day: s.day,
      phase: s.phase,
      history: s.history,
      running: s.running,
      config: configRef.current,
      ...overrides,
    }));
  }, []);

  // Stable string that changes only when strategy group data changes.
  const strategyGroupsKey = useMemo(
    () => JSON.stringify(config.strategyGroups),
    [config.strategyGroups],
  );

  // Before first start, reflect strategy group changes immediately.
  useEffect(() => {
    const s = stateRef.current;
    if (s.running) return;
    if (s.day !== 0 || s.history.length !== 0) return;

    s.agents = buildInitialAgents(configRef.current);
    s.foodPairs = [];
    s.phase = 'idle';
    pushRender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyGroupsKey, pushRender]);

  // ─── Run one complete day (used in turbo mode) ────────────────────────────
  const runOneDayInstant = useCallback(() => {
    const s = stateRef.current;
    const cfg = configRef.current;

    s.day += 1;

    // Food pairs
    const foodCount = cfg.foodPairsOverride ?? Math.max(1, Math.floor(s.agents.length / 2));
    s.foodPairs = spawnFood(foodCount, s.agents.length);

    // Assign + resolve
    for (const a of s.agents) {
      a.x = a.homeX;
      a.y = a.homeY;
    }
    assignFood(s.agents, s.foodPairs);
    resolveEncounters(s.agents, s.foodPairs);

    // Survival
    const nextGen = evaluateSurvival(s.agents);
    layoutVillageHomes(nextGen, true);
    s.agents = nextGen;

    // Record history
    s.history = [...s.history, buildDayRecord(s.day, nextGen)];

    // Stop if population extinct
    if (nextGen.length === 0) s.running = false;
  }, []);

  // ─── Animation loop ────────────────────────────────────────────────────────
  const tick = useCallback((timestamp: number) => {
    const s = stateRef.current;
    const cfg = configRef.current;

    if (!s.running) {
      pushRender();
      return;
    }

    // ── Turbo mode: resolve as many days as possible per frame ─────────────
    if (cfg.turbo) {
      const batchStart = performance.now();
      // Run days for up to 16 ms worth of budget per frame
      while (s.running && performance.now() - batchStart < 14) {
        runOneDayInstant();
      }
      pushRender();
      if (s.running) rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // ── Animated mode ──────────────────────────────────────────────────────
    const elapsed = timestamp - phaseStartRef.current;

    switch (s.phase) {
      case 'idle': {
        // Kick off a new day
        s.day += 1;
        // Every day starts from each villager's home.
        for (const a of s.agents) {
          a.x = a.homeX;
          a.y = a.homeY;
        }
        const foodCount = cfg.foodPairsOverride ?? Math.max(1, Math.floor(s.agents.length / 2));
        s.foodPairs = spawnFood(foodCount, s.agents.length);
        // Reset food counters
        for (const a of s.agents) a.food = 0;
        s.phase = 'spawning';
        phaseStartRef.current = timestamp;
        pushRender();
        break;
      }

      case 'spawning': {
        const duration = PHASE_DURATIONS.spawning / cfg.simSpeed;
        if (elapsed >= duration) {
          // Assign food & record start positions for lerp
          assignFood(s.agents, s.foodPairs);

          startPositions.current.clear();
          targetPositions.current.clear();
          for (const a of s.agents) {
            startPositions.current.set(a.id, { x: a.x, y: a.y });
            if (a.targetFoodId) {
              const fp = s.foodPairs.find(f => f.id === a.targetFoodId);
              if (fp) targetPositions.current.set(a.id, { x: fp.x, y: fp.y });
            }
          }

          s.phase = 'foraging';
          phaseStartRef.current = timestamp;
        }
        pushRender();
        break;
      }

      case 'foraging': {
        // Each agent has its own duration based on distance / (speed * simSpeed)
        let allDone = true;

        const renderAgents: RenderAgent[] = s.agents.map(agent => {
          const start = startPositions.current.get(agent.id);
          const target = targetPositions.current.get(agent.id);

          if (!start || !target) {
            return { ...agent, moveProgress: 1 };
          }

          const d = Math.hypot(target.x - start.x, target.y - start.y);
          if (d < 0.5) {
            return { ...agent, x: target.x, y: target.y, moveProgress: 1 };
          }

          // duration in ms = (distance / speed) * 1000 / simSpeed
          const moveDurationMs = (d / agent.speed) * 1000 / cfg.simSpeed;
          const t = Math.min(elapsed / moveDurationMs, 1);
          const easedT = easeInOut(t);

          if (t < 1) allDone = false;

          return {
            ...agent,
            x: start.x + (target.x - start.x) * easedT,
            y: start.y + (target.y - start.y) * easedT,
            moveProgress: t,
          };
        });

        setRenderState(prev => ({
          ...prev,
          agents: renderAgents,
          foodPairs: s.foodPairs,
          day: s.day,
          phase: s.phase,
          running: s.running,
          config: cfg,
        }));

        if (allDone) {
          // Update agent positions to their targets
          for (const a of s.agents) {
            const t = targetPositions.current.get(a.id);
            if (t) { a.x = t.x; a.y = t.y; }
          }
          resolveEncounters(s.agents, s.foodPairs);
          s.phase = 'resolution';
          phaseStartRef.current = timestamp;
        }
        break;
      }

      case 'resolution': {
        const duration = PHASE_DURATIONS.resolution / cfg.simSpeed;
        if (elapsed >= duration) {
          // Prepare return trip back to homes.
          startPositions.current.clear();
          targetPositions.current.clear();
          for (const a of s.agents) {
            startPositions.current.set(a.id, { x: a.x, y: a.y });
            targetPositions.current.set(a.id, { x: a.homeX, y: a.homeY });
          }

          s.phase = 'returning';
          phaseStartRef.current = timestamp;
        }
        pushRender();
        break;
      }

      case 'returning': {
        let allDone = true;

        const renderAgents: RenderAgent[] = s.agents.map(agent => {
          const start = startPositions.current.get(agent.id);
          const target = targetPositions.current.get(agent.id);

          if (!start || !target) {
            return { ...agent, moveProgress: 1 };
          }

          const d = Math.hypot(target.x - start.x, target.y - start.y);
          if (d < 0.5) {
            return { ...agent, x: target.x, y: target.y, moveProgress: 1 };
          }

          // Keep return trip visible at high speed multipliers.
          const moveDurationMs = Math.max(
            PHASE_DURATIONS.returning / cfg.simSpeed,
            ((d / agent.speed) * 1000) / cfg.simSpeed,
          );
          const t = Math.min(elapsed / moveDurationMs, 1);
          const easedT = easeInOut(t);

          if (t < 1) allDone = false;

          return {
            ...agent,
            x: start.x + (target.x - start.x) * easedT,
            y: start.y + (target.y - start.y) * easedT,
            moveProgress: t,
          };
        });

        setRenderState(prev => ({
          ...prev,
          agents: renderAgents,
          foodPairs: s.foodPairs,
          day: s.day,
          phase: s.phase,
          running: s.running,
          config: cfg,
        }));

        if (allDone) {
          for (const a of s.agents) {
            const t = targetPositions.current.get(a.id);
            if (t) { a.x = t.x; a.y = t.y; }
          }

          const nextGen = evaluateSurvival(s.agents);
          layoutVillageHomes(nextGen, true);
          s.agents = nextGen;

          s.history = [...s.history, buildDayRecord(s.day, nextGen)];

          if (nextGen.length === 0) {
            s.running = false;
            s.phase = 'idle';
          } else {
            s.phase = 'evolving';
            phaseStartRef.current = timestamp;
          }
        }
        break;
      }

      case 'evolving': {
        const duration = PHASE_DURATIONS.evolving / cfg.simSpeed;
        if (elapsed >= duration) {
          s.phase = 'idle';
        }
        pushRender();
        break;
      }
    }

    if (s.running) rafRef.current = requestAnimationFrame(tick);
    else pushRender();
  }, [pushRender, runOneDayInstant]);

  // ─── Controls ──────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const s = stateRef.current;
    if (s.running) return;
    s.running = true;
    s.phase = 'idle';
    phaseStartRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    pushRender();
  }, [tick, pushRender]);

  const pause = useCallback(() => {
    stateRef.current.running = false;
    cancelAnimationFrame(rafRef.current);
    pushRender();
  }, [pushRender]);

  const step = useCallback(() => {
    const s = stateRef.current;
    if (s.running) return;
    runOneDayInstant();
    pushRender();
  }, [runOneDayInstant, pushRender]);

  const reset = useCallback((newCfg?: SimConfig) => {
    cancelAnimationFrame(rafRef.current);
    const cfg = newCfg ?? configRef.current;
    stateRef.current = {
      agents: buildInitialAgents(cfg),
      foodPairs: [],
      day: 0,
      phase: 'idle',
      history: [],
      running: false,
    };
    startPositions.current.clear();
    targetPositions.current.clear();
    pushRender();
  }, [pushRender]);

  const setConfig = useCallback((updater: Partial<SimConfig> | ((c: SimConfig) => SimConfig)) => {
    setConfigState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      configRef.current = next;
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { renderState, config, start, pause, step, reset, setConfig };
}

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
