import type { SimConfig } from './types';

// ─── World ────────────────────────────────────────────────────────────────────
export const WORLD_W = 800;
export const WORLD_H = 560;
export const VILLAGE_CENTER_X = WORLD_W / 2;
export const VILLAGE_CENTER_Y = WORLD_H / 2;
export const VILLAGE_INNER_RING_RADIUS = 140;
export const VILLAGE_RING_STEP = 52;

// Agent visual radius (canvas pixels)
export const AGENT_RADIUS = 9;
// Food visual radius
export const FOOD_RADIUS = 5;

// ─── Payoff Matrix ────────────────────────────────────────────────────────────
// Food gained per role when two agents share a food pair (total pair value = 2)
export const PAYOFFS = {
  uncontested:  2.0,   // lone agent gets both pieces

  doveDove: {
    each: 1.0,         // share equally
  },

  hawkDove: {
    hawk: 1.5,
    dove: 0.5,
  },

  hawkHawk: {
    each: 0.0,         // fight cost cancels the gain
  },
} as const;

// ─── Survival & Reproduction ─────────────────────────────────────────────────
// Maps food amount → { survivalChance, reproChance }
export const SURVIVAL_TABLE: Record<number, { survive: number; reproduce: number }> = {
  0:   { survive: 0.00, reproduce: 0.00 },
  0.5: { survive: 0.50, reproduce: 0.00 },
  1.0: { survive: 1.00, reproduce: 0.00 },
  1.5: { survive: 1.00, reproduce: 0.50 },
  2.0: { survive: 1.00, reproduce: 1.00 },
};

// ─── Default Config ───────────────────────────────────────────────────────────
export const DEFAULT_CONFIG: SimConfig = {
  strategyGroups: [
    { strategy: 'hawk', count: 10, speedMin: 80, speedMax: 160 },
    { strategy: 'dove', count: 10, speedMin: 80, speedMax: 160 },
  ],
  foodPairsOverride: null,   // auto = floor(population / 2)
  simSpeed:          1,
  turbo:             false,
};

// ─── Animation Durations (ms at 1× speed) ────────────────────────────────────
export const PHASE_DURATIONS = {
  spawning:   300,
  resolution: 500,
  returning:  650,
  evolving:   400,
} as const;

// ─── Population Cap ───────────────────────────────────────────────────────────
export const MAX_POPULATION = 300;
