import type { Agent, FoodPair, StrategyTag } from './types';
import {
  WORLD_W, WORLD_H,
  VILLAGE_CENTER_X, VILLAGE_CENTER_Y,
  VILLAGE_INNER_RING_RADIUS,
  PAYOFFS, SURVIVAL_TABLE, MAX_POPULATION,
} from './constants';

// ─── ID generation ───────────────────────────────────────────────────────────
let _nextId = 0;
const uid = () => `${++_nextId}`;

// ─── Food Spawning ────────────────────────────────────────────────────────────
export function spawnFood(count: number, villagerCount: number): FoodPair[] {
  const pairs: FoodPair[] = [];
  const outerRadius = getVillageOuterRadius(villagerCount);
  const foodRadius = outerRadius * 0.6;
  for (let i = 0; i < count; i++) {
    // Uniform random in disk: radius uses sqrt(u) to avoid center clustering.
    const theta = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * foodRadius;
    pairs.push({
      id: uid(),
      x: VILLAGE_CENTER_X + Math.cos(theta) * r,
      y: VILLAGE_CENTER_Y + Math.sin(theta) * r,
      assignedAgentIds: [],
      resolved: false,
    });
  }
  return pairs;
}

// ─── Agent Creation ───────────────────────────────────────────────────────────
export function createAgent(
  strategy: StrategyTag,
  speed: number,
  x?: number,
  y?: number,
): Agent {
  const px = x ?? VILLAGE_CENTER_X;
  const py = y ?? VILLAGE_CENTER_Y;
  return {
    id: uid(),
    x: px,
    y: py,
    homeX: px,
    homeY: py,
    strategies: [strategy],
    speed,
    food: 0,
    targetFoodId: null,
    alive: true,
  };
}

// ─── Food Assignment ──────────────────────────────────────────────────────────
/**
 * Assign each living agent to a food pair.
 * Priority: the 2 agents with the shortest arrival time (distance / speed)
 * win each pair. Losers are redirected to the nearest non-full pair.
 * If none is available the agent gets no food (targetFoodId = null).
 */
export function assignFood(agents: Agent[], foodPairs: FoodPair[]): void {
  // Reset assignments
  for (const fp of foodPairs) fp.assignedAgentIds = [];
  const living = agents.filter(a => a.alive);

  // Step 1 – each agent picks a random food pair as their first preference
  const preferences = new Map<string, string>(); // agentId → foodPairId
  for (const agent of living) {
    const fp = foodPairs[Math.floor(Math.random() * foodPairs.length)];
    preferences.set(agent.id, fp.id);
    agent.targetFoodId = null;
  }

  // Step 2 – resolve conflicts: for each over-subscribed pair keep the 2
  //           with the lowest arrivalTime = dist / speed; redirect the rest
  const unassigned: Agent[] = [];

  // Group agents by their preferred pair
  const byPair = new Map<string, Agent[]>();
  for (const agent of living) {
    const fpId = preferences.get(agent.id)!;
    if (!byPair.has(fpId)) byPair.set(fpId, []);
    byPair.get(fpId)!.push(agent);
  }

  for (const [fpId, contenders] of byPair) {
    const fp = foodPairs.find(f => f.id === fpId)!;
    if (contenders.length <= 2) {
      // All fit
      for (const a of contenders) {
        fp.assignedAgentIds.push(a.id);
        a.targetFoodId = fpId;
      }
    } else {
      // Sort by arrival time ascending; keep the 2 fastest
      contenders.sort((a, b) => dist(a, fp) / a.speed - dist(b, fp) / b.speed);
      for (let i = 0; i < contenders.length; i++) {
        if (i < 2) {
          fp.assignedAgentIds.push(contenders[i].id);
          contenders[i].targetFoodId = fpId;
        } else {
          unassigned.push(contenders[i]);
        }
      }
    }
  }

  // Step 3 – redirect unassigned agents to nearest non-full pair
  for (const agent of unassigned) {
    const available = foodPairs
      .filter(fp => fp.assignedAgentIds.length < 2)
      .sort((a, b) => dist(agent, a) - dist(agent, b));

    if (available.length > 0) {
      const fp = available[0];
      fp.assignedAgentIds.push(agent.id);
      agent.targetFoodId = fp.id;
    } else {
      agent.targetFoodId = null; // no food available
    }
  }
}

// ─── Encounter Resolution ─────────────────────────────────────────────────────
/**
 * Apply payoff matrix to every food pair and credit food to agents.
 * Resets each agent's food counter first.
 */
export function resolveEncounters(agents: Agent[], foodPairs: FoodPair[]): void {
  const agentMap = new Map<string, Agent>(agents.map(a => [a.id, a]));

  // Zero out food for this day
  for (const a of agents) a.food = 0;

  for (const fp of foodPairs) {
    const [id1, id2] = fp.assignedAgentIds;
    const a1 = id1 ? agentMap.get(id1) : undefined;
    const a2 = id2 ? agentMap.get(id2) : undefined;

    if (!a1) continue; // no one claimed this pair

    if (!a2) {
      // Uncontested
      a1.food += PAYOFFS.uncontested;
    } else {
      const s1 = a1.strategies[0];
      const s2 = a2.strategies[0];

      if (s1 === 'dove' && s2 === 'dove') {
        a1.food += PAYOFFS.doveDove.each;
        a2.food += PAYOFFS.doveDove.each;
      } else if (s1 === 'hawk' && s2 === 'dove') {
        a1.food += PAYOFFS.hawkDove.hawk;
        a2.food += PAYOFFS.hawkDove.dove;
      } else if (s1 === 'dove' && s2 === 'hawk') {
        a1.food += PAYOFFS.hawkDove.dove;
        a2.food += PAYOFFS.hawkDove.hawk;
      } else {
        // hawk vs hawk
        a1.food += PAYOFFS.hawkHawk.each;
        a2.food += PAYOFFS.hawkHawk.each;
      }
    }

    fp.resolved = true;
  }
}

// ─── Survival & Reproduction ──────────────────────────────────────────────────
/** Speed mutation factor per generation (±10%). */
const SPEED_MUTATION = 0.10;

/**
 * Returns the survivors + any new offspring.
 * Offspring inherit parent speed with ±SPEED_MUTATION random variation.
 * Agents with food values outside the table are clamped to nearest key.
 */
export function evaluateSurvival(agents: Agent[]): Agent[] {
  const survivors: Agent[] = [];
  const offspring: Agent[] = [];

  for (const agent of agents) {
    if (!agent.alive) continue;

    const tableKey = snapToTableKey(agent.food);
    const row = SURVIVAL_TABLE[tableKey];

    const survives = Math.random() < row.survive;
    if (!survives) continue;

    survivors.push(agent);

    if (survivors.length + offspring.length < MAX_POPULATION) {
      const reproduces = Math.random() < row.reproduce;
      if (reproduces) {
        const mutation = 1 + (Math.random() * 2 - 1) * SPEED_MUTATION;
        const childSpeed = Math.max(20, Math.min(400, agent.speed * mutation));
        const child = createAgent(
          agent.strategies[0],
          childSpeed,
          agent.x,
          agent.y,
        );
        offspring.push(child);
      }
    }
  }

  return [...survivors, ...offspring];
}

// ─── Village Home Layout ─────────────────────────────────────────────────────
/**
 * Places all homes on one ring centered on the village core.
 * As population increases, the ring radius expands instead of creating
 * additional rings.
 */
export function layoutVillageHomes(agents: Agent[], snapAgentsToHomes = false): void {
  if (agents.length === 0) return;

  // Stable order keeps homes from shuffling every day.
  const ordered = [...agents].sort((a, b) => Number(a.id) - Number(b.id));
  const radius = getVillageOuterRadius(ordered.length);

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    const angle = (Math.PI * 2 * i) / ordered.length;
    const hx = clamp(VILLAGE_CENTER_X + Math.cos(angle) * radius, 12, WORLD_W - 12);
    const hy = clamp(VILLAGE_CENTER_Y + Math.sin(angle) * radius, 12, WORLD_H - 12);
    a.homeX = hx;
    a.homeY = hy;
    if (snapAgentsToHomes) {
      a.x = hx;
      a.y = hy;
    }
  }
}

export function getVillageOuterRadius(villagerCount: number): number {
  const spacing = 30;
  const requiredRadius = (Math.max(villagerCount, 1) * spacing) / (2 * Math.PI);
  const maxRadius = Math.min(WORLD_W, WORLD_H) / 2 - 16;
  return clamp(
    Math.max(VILLAGE_INNER_RING_RADIUS, requiredRadius),
    VILLAGE_INNER_RING_RADIUS,
    maxRadius,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Snap food amount to the nearest entry in SURVIVAL_TABLE.
 * Food > 2 is treated as 2; food < 0 as 0.
 */
function snapToTableKey(food: number): number {
  const keys = [0, 0.5, 1.0, 1.5, 2.0];
  const clamped = Math.max(0, Math.min(2, food));
  let closest = keys[0];
  let minDiff = Math.abs(clamped - keys[0]);
  for (const k of keys) {
    const d = Math.abs(clamped - k);
    if (d < minDiff) { minDiff = d; closest = k; }
  }
  return closest;
}
