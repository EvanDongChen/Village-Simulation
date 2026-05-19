// ─── Strategy Tag System ─────────────────────────────────────────────────────
// Extend this union to add new behaviours without touching engine logic.
export type StrategyTag = 'hawk' | 'dove';

// ─── Agent ───────────────────────────────────────────────────────────────────
export interface Agent {
  id: string;
  /** World-space X position (0 – WORLD_W) */
  x: number;
  /** World-space Y position (0 – WORLD_H) */
  y: number;
  /** Ordered list of strategy tags; strategies[0] is the primary behaviour */
  strategies: StrategyTag[];
  /** Units per second – determines arrival priority at food pairs */
  speed: number;
  /** Accumulated food for the current day */
  food: number;
  /** ID of the food pair this agent is moving toward this day (null = homeless) */
  targetFoodId: string | null;
  alive: boolean;
}

// ─── Food Pair ────────────────────────────────────────────────────────────────
export interface FoodPair {
  id: string;
  x: number;
  y: number;
  /** Up to 2 agent IDs assigned here for this day */
  assignedAgentIds: string[];
  /** Whether this pair has already been resolved (payoffs applied) */
  resolved: boolean;
}

// ─── History ─────────────────────────────────────────────────────────────────
export interface DayRecord {
  day: number;
  total: number;
  hawks: number;
  doves: number;
}

// ─── Phase Machine ───────────────────────────────────────────────────────────
export type SimPhase =
  | 'idle'        // waiting to start / paused
  | 'spawning'    // food pairs appear
  | 'foraging'    // agents animate toward food
  | 'resolution'  // payoffs flash, brief pause
  | 'evolving';   // dead agents fade, offspring appear

// ─── Simulation Config (user-configurable) ───────────────────────────────────
export interface SimConfig {
  initialHawks: number;
  initialDoves: number;
  /** Food pairs spawned per day (0 = auto: floor(population/2)) */
  foodPairsOverride: number | null;
  /** Base movement speed for all agents (pixels/second at 1× sim speed) */
  agentSpeed: number;
  /** Animation speed multiplier 0.5 – 20 */
  simSpeed: number;
  /** Skip all animation, resolve days as fast as possible */
  turbo: boolean;
}

// ─── Master State ─────────────────────────────────────────────────────────────
export interface SimulationState {
  agents: Agent[];
  foodPairs: FoodPair[];
  day: number;
  phase: SimPhase;
  history: DayRecord[];
  running: boolean;
}
