import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, FoodPair, SimConfig, SimulationState } from '../simulation/types';
import { DEFAULT_CONFIG, PHASE_DURATIONS } from '../simulation/constants';
import {
  createAgent,
  spawnFood,
  assignFood,
  resolveEncounters,
  evaluateSurvival,
} from '../simulation/engine';

// ─── Interpolated render positions ────────────────────────────────────────────
export interface RenderAgent {
  id: string;
  x: number;
  y: number;
  strategies: Agent['strategies'];
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
  for (let i = 0; i < cfg.initialHawks; i++)
    agents.push(createAgent('hawk', cfg.agentSpeed));
  for (let i = 0; i < cfg.initialDoves; i++)
    agents.push(createAgent('dove', cfg.agentSpeed));
  return agents;
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
      })),
      foodPairs: s.foodPairs,
      day: s.day,
      phase: s.phase,
      history: s.history,
      running: s.running,
      config: configRef.current,
      ...overrides,
    }));
  }, []);

  // ─── Run one complete day (used in turbo mode) ────────────────────────────
  const runOneDayInstant = useCallback(() => {
    const s = stateRef.current;
    const cfg = configRef.current;

    s.day += 1;

    // Food pairs
    const foodCount = cfg.foodPairsOverride ?? Math.max(1, Math.floor(s.agents.length / 2));
    s.foodPairs = spawnFood(foodCount);

    // Assign + resolve
    assignFood(s.agents, s.foodPairs);
    resolveEncounters(s.agents, s.foodPairs);

    // Survival
    const nextGen = evaluateSurvival(s.agents, cfg.agentSpeed);
    s.agents = nextGen;

    // Record history
    const hawks = nextGen.filter(a => a.strategies[0] === 'hawk').length;
    const doves = nextGen.filter(a => a.strategies[0] === 'dove').length;
    s.history = [...s.history, { day: s.day, total: nextGen.length, hawks, doves }];

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
        const foodCount = cfg.foodPairsOverride ?? Math.max(1, Math.floor(s.agents.length / 2));
        s.foodPairs = spawnFood(foodCount);
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
          const nextGen = evaluateSurvival(s.agents, cfg.agentSpeed);
          s.agents = nextGen;

          const hawks = nextGen.filter(a => a.strategies[0] === 'hawk').length;
          const doves = nextGen.filter(a => a.strategies[0] === 'dove').length;
          s.history = [...s.history, {
            day: s.day, total: nextGen.length, hawks, doves,
          }];

          if (nextGen.length === 0) {
            s.running = false;
            s.phase = 'idle';
          } else {
            s.phase = 'evolving';
            phaseStartRef.current = timestamp;
          }
        }
        pushRender();
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
