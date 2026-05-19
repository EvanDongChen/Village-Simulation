import { useEffect, useRef } from 'react';
import type { RenderState } from '../hooks/useSimulation';
import { WORLD_W, WORLD_H, AGENT_RADIUS, FOOD_RADIUS } from '../simulation/constants';

interface Props {
  renderState: RenderState;
}

// Colours
const HAWK_FILL   = '#ef4444'; // red-500
const HAWK_STROKE = '#fca5a5'; // red-300
const DOVE_FILL   = '#3b82f6'; // blue-500
const DOVE_STROKE = '#93c5fd'; // blue-300
const FOOD_FILL   = '#facc15'; // yellow-400
const FOOD_GLOW   = 'rgba(250,204,21,0.35)';
const GRID_COLOR  = 'rgba(255,255,255,0.04)';
const BG_COLOR    = '#0f1117';

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

    // ── Agents ────────────────────────────────────────────────────────────────
    for (const agent of agents) {
      if (!agent.alive) continue;
      const isHawk = agent.strategies[0] === 'hawk';
      const fill   = isHawk ? HAWK_FILL   : DOVE_FILL;
      const stroke = isHawk ? HAWK_STROKE : DOVE_STROKE;

      // Resolution flash: pulse brightness when phase = resolution
      let alpha = 1;
      if (phase === 'resolution' && agent.food > 0) {
        alpha = 0.85 + 0.15 * Math.sin(Date.now() / 100);
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Drop shadow / glow
      ctx.shadowColor = fill;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(agent.x, agent.y, AGENT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stroke;
      ctx.stroke();

      // Strategy icon: H / D
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${AGENT_RADIUS}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isHawk ? 'H' : 'D', agent.x, agent.y + 0.5);

      ctx.restore();
    }

    // ── Phase label (top-left) ─────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(phase.toUpperCase(), 10, 8);

  }, [renderState]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
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
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}
