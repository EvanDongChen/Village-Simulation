import { useEffect, useRef } from 'react';
import type { RenderState } from '../hooks/useSimulation';
import {
  WORLD_W,
  WORLD_H,
  AGENT_RADIUS,
  FOOD_RADIUS,
  VILLAGE_CENTER_X,
  VILLAGE_CENTER_Y,
} from '../simulation/constants';

interface Props {
  renderState: RenderState;
}

// Colours
const HAWK_FILL = '#9a3f3a';
const HAWK_STROKE = '#bc766f';
const DOVE_FILL = '#3f7a74';
const DOVE_STROKE = '#78a9a3';
const FOOD_FILL = '#d5b483';
const FOOD_GLOW = 'rgba(213,180,131,0.18)';
const GRID_COLOR = 'rgba(90,74,57,0.12)';
const BG_COLOR = '#f3ece2';

export default function SimulationCanvas({ renderState }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = WORLD_W;
    const H = WORLD_H;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { agents, foodPairs, phase } = renderState;
    const W = WORLD_W;
    const H = WORLD_H;

    // ── Background ───────────────────────────────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // ── Grid ─────────────────────────────────────────────────────────────────
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const gridStep = 40;
    ctx.beginPath();
    for (let x = 0; x <= W; x += gridStep) {
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += gridStep) {
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();

    // ── Food pairs ────────────────────────────────────────────────────────────
    for (const fp of foodPairs) {
      // Glow
      const grd = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, FOOD_RADIUS * 3);
      grd.addColorStop(0, FOOD_GLOW);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, FOOD_RADIUS * 3, 0, Math.PI * 2);
      ctx.fill();

      // Two offset dots representing the pair
      drawFood(ctx, fp.x - 4, fp.y, FOOD_RADIUS);
      drawFood(ctx, fp.x + 4, fp.y, FOOD_RADIUS);
    }

    // ── Village homes (concentric rings) ────────────────────────────────────
    for (const agent of agents) {
      if (!agent.alive) continue;
      drawHouse(ctx, agent.homeX, agent.homeY);
    }

    // Center hub marker where food spawns
    ctx.save();
    ctx.strokeStyle = 'rgba(138, 106, 66, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(VILLAGE_CENTER_X, VILLAGE_CENTER_Y, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(138, 106, 66, 0.14)';
    ctx.beginPath();
    ctx.arc(VILLAGE_CENTER_X, VILLAGE_CENTER_Y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Agents ────────────────────────────────────────────────────────────────
    for (const agent of agents) {
      if (!agent.alive) continue;
      const isHawk = agent.strategies[0] === 'hawk';
      const fill   = isHawk ? HAWK_FILL   : DOVE_FILL;
      const stroke = isHawk ? HAWK_STROKE : DOVE_STROKE;
      // Dot radius scales slightly with speed (range ~20–400 px/s → 6–13 px)
      const r = Math.max(6, Math.min(13, 6 + agent.speed / 28));

      // Resolution flash: pulse brightness when phase = resolution
      let alpha = 1;
      if (phase === 'resolution' && agent.food > 0) {
        alpha = 0.85 + 0.15 * Math.sin(Date.now() / 100);
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Keep a very soft edge without a strong glow.
      ctx.shadowColor = fill;
      ctx.shadowBlur = 2;

      ctx.beginPath();
      ctx.arc(agent.x, agent.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stroke;
      ctx.stroke();

      // Strategy icon: H / D
      ctx.fillStyle = '#fffdf9';
      ctx.font = `bold ${Math.round(r)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isHawk ? 'H' : 'D', agent.x, agent.y + 0.5);

      ctx.restore();
    }

    // ── Phase label (top-left) ─────────────────────────────────────────────
    ctx.fillStyle = 'rgba(66,52,40,0.62)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(phase.toUpperCase(), 10, 8);

  }, [renderState]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden border border-[#cdbfae] shadow-[0_6px_16px_rgba(70,55,39,0.16)]"
      style={{ width: WORLD_W, height: WORLD_H, flexShrink: 0 }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function drawFood(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = FOOD_FILL;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,74,57,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.75;

  ctx.fillStyle = 'rgba(129, 114, 96, 0.45)';
  ctx.fillRect(-4, -3, 8, 6);

  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(0, -7);
  ctx.lineTo(5, -3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(106, 93, 78, 0.65)';
  ctx.fill();

  ctx.restore();
}
