import { GameState, TileType, Player, Zombie } from '../game/types';

const EO = 8; // elevation offset per level (px)

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  const { map, players, zombies } = state;
  const ts = map.tileSize;
  const cw = map.cols * ts;
  const ch = map.rows * ts;
  const t = state.survivalTime;

  // ── 1. Background ──
  ctx.fillStyle = '#0a0a0e';
  ctx.fillRect(0, 0, cw, ch);

  // ── 2. Ground tiles ──
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const x = c * ts;
      const y = r * ts;
      if (map.tiles[r][c] === TileType.WALL) {
        drawWall(ctx, x, y, ts);
      } else if (map.heights[r][c] === 0) {
        drawFloor(ctx, x, y, ts, c, r);
      }
    }
  }

  // ── 3. Elevated tiles (back to front) ──
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const h = map.heights[r][c];
      if (h === 0 || map.tiles[r][c] === TileType.WALL) continue;
      drawElevated(ctx, c * ts, r * ts, ts, h);
    }
  }

  // ── 4. Entities sorted by screen-y ──
  type DrawEntry = { screenY: number; draw: () => void };
  const entries: DrawEntry[] = [];

  for (const p of players) {
    if (!p.alive) continue;
    const elev = p.isClimbing
      ? p.elevation + (p.climbTargetElevation - p.elevation) * p.climbProgress
      : p.elevation;
    const sy = p.position.y + p.size.height - elev * EO;
    entries.push({ screenY: sy, draw: () => drawPlayer(ctx, p, t, elev) });
  }
  for (const z of zombies) {
    if (!z.alive) continue;
    const elev = z.isClimbing
      ? z.elevation + (z.climbTargetElevation - z.elevation) * z.climbProgress
      : z.elevation;
    const sy = z.position.y + z.size.height - elev * EO;
    entries.push({ screenY: sy, draw: () => drawZombie(ctx, z, t, elev) });
  }
  entries.sort((a, b) => a.screenY - b.screenY);
  for (const e of entries) e.draw();

  // ── 5. Danger vignette ──
  const alive = players.filter(p => p.alive);
  if (alive.length > 0 && zombies.length > 0) {
    let minDist = Infinity;
    for (const p of alive) {
      const pcx = p.position.x + p.size.width / 2;
      const pcy = p.position.y + p.size.height / 2;
      for (const z of zombies) {
        if (!z.alive || z.elevation !== p.elevation) continue;
        const dx = z.position.x + z.size.width / 2 - pcx;
        const dy = z.position.y + z.size.height / 2 - pcy;
        minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (minDist < 80) {
      const intensity = (1 - minDist / 80) * 0.25;
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.15, cw / 2, ch / 2, cw * 0.6);
      grad.addColorStop(0, 'rgba(180,0,0,0)');
      grad.addColorStop(1, `rgba(180,0,0,${intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  // ── 6. Lighting overlay ──
  if (state.lightLevel < 1) {
    drawLighting(ctx, cw, ch, state);
  }

  // ── 7. Flicker during transition (8-12s) ──
  if (t >= 8 && t < 12 && Math.sin(t * 18) > 0.7) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.3})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  // ── 8. Wave indicator ──
  if (state.wave > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${state.wave}`, cw - 8, ch - 8);
  }

  // ── 9. Prep countdown ──
  if (state.prepTime > 0) {
    const sec = Math.ceil(state.prepTime);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, cw, 50);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scale = 1 + (state.prepTime % 1) * 0.15;
    ctx.save();
    ctx.translate(cw / 2, 22);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`${sec}`, 0, 0);
    ctx.restore();

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('RUN OR DIE', cw / 2, 46);

    const borderAlpha = 0.15 + Math.sin(t * 6) * 0.08;
    ctx.strokeStyle = `rgba(255,100,50,${borderAlpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, cw - 4, ch - 4);
  }

  // ── 10. Dead player markers ──
  for (const p of players) {
    if (p.alive) continue;
    const cx = p.position.x + p.size.width / 2;
    const cy = p.position.y + p.size.height / 2;
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.1;
    ctx.fillStyle = p.color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.name}`, cx, cy - 4);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('\u2620', cx, cy + 8);
    ctx.restore();
  }
}

// ── Tile drawing ──

function drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, col: number, row: number) {
  const hash = tileHash(col, row);
  const v = (hash % 10) - 5;
  ctx.fillStyle = `rgb(${24 + v},${24 + v},${28 + v})`;
  ctx.fillRect(x, y, ts, ts);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, ts, ts);

  // Occasional cracks
  if (hash % 7 === 0) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + (hash % ts), y + ((hash >> 8) % ts));
    ctx.lineTo(x + ((hash >> 4) % ts), y + ((hash >> 12) % ts));
    ctx.stroke();
  }

  // Occasional debris
  if (hash % 11 === 0) {
    ctx.fillStyle = 'rgba(60,50,40,0.15)';
    ctx.fillRect(x + (hash % 15) + 3, y + ((hash >> 6) % 15) + 3, 4, 3);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number) {
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(x, y, ts, ts);

  // Bevel highlights
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(x + 1, y + 1, ts - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, ts - 2);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 1, y + ts - 2, ts - 2, 1);
  ctx.fillRect(x + ts - 2, y + 1, 1, ts - 2);
}

function drawElevated(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, h: number) {
  const offset = h * EO;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + 3, ts, ts);

  // South face
  ctx.fillStyle = h === 1 ? '#2a1810' : '#1a2530';
  ctx.fillRect(x, y - offset + ts, ts, offset);

  // South face edge
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y - offset + ts, ts, offset);

  // Top face
  ctx.fillStyle = h === 1 ? '#4a3828' : '#384550';
  ctx.fillRect(x, y - offset, ts, ts);

  // Top face texture
  if (h === 1) {
    // Wood grain / crate marks
    ctx.strokeStyle = 'rgba(90,60,30,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - offset + 4);
    ctx.lineTo(x + ts - 4, y - offset + 4);
    ctx.moveTo(x + 4, y - offset + ts - 4);
    ctx.lineTo(x + ts - 4, y - offset + ts - 4);
    ctx.stroke();
    // Cross mark
    ctx.strokeStyle = 'rgba(80,50,20,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 6, y - offset + 6);
    ctx.lineTo(x + ts - 6, y - offset + ts - 6);
    ctx.moveTo(x + ts - 6, y - offset + 6);
    ctx.lineTo(x + 6, y - offset + ts - 6);
    ctx.stroke();
  } else {
    // Metal container ribs
    ctx.strokeStyle = 'rgba(80,120,150,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 5; i < ts - 4; i += 6) {
      ctx.beginPath();
      ctx.moveTo(x + i, y - offset + 2);
      ctx.lineTo(x + i, y - offset + ts - 2);
      ctx.stroke();
    }
  }

  // Highlight edges (top-left)
  ctx.strokeStyle = h === 1 ? 'rgba(120,90,50,0.25)' : 'rgba(80,130,160,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - offset + ts);
  ctx.lineTo(x, y - offset);
  ctx.lineTo(x + ts, y - offset);
  ctx.stroke();
}

// ── Lighting ──

function drawLighting(ctx: CanvasRenderingContext2D, cw: number, ch: number, state: GameState) {
  const darkness = 1 - state.lightLevel;

  ctx.save();
  ctx.fillStyle = `rgba(2,2,8,${darkness * 0.92})`;
  ctx.fillRect(0, 0, cw, ch);

  // Cut out light around alive players
  ctx.globalCompositeOperation = 'destination-out';
  const alive = state.players.filter(p => p.alive);
  for (const p of alive) {
    const cx = p.position.x + p.size.width / 2;
    const cy = p.position.y + p.size.height / 2;
    const r = state.lightRadius;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Warm glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of alive) {
    const cx = p.position.x + p.size.width / 2;
    const cy = p.position.y + p.size.height / 2;
    const r = state.lightRadius * 0.6;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(255,200,100,${0.06 * darkness})`);
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Player ──

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, t: number, visualElev: number) {
  const cx = p.position.x + p.size.width / 2;
  const cy = p.position.y + p.size.height / 2;
  const sy = cy - visualElev * EO;
  const bob = p.isClimbing ? 0 : Math.sin(p.walkCycle) * 1.5;
  const legSwing = p.isClimbing ? 0 : Math.sin(p.walkCycle) * 4;

  ctx.save();
  ctx.translate(cx, sy + bob);

  if (p.damageFlash > 0 && Math.sin(t * 30) > 0) {
    ctx.globalAlpha = 0.5;
  }

  // Shadow at ground level
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 10 + visualElev * EO, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.isClimbing) {
    drawClimbingBody(ctx, p);
  } else {
    drawRunningBody(ctx, p, legSwing);
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // Name tag
  ctx.fillStyle = p.color;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, cx, sy - 18);
}

function drawRunningBody(ctx: CanvasRenderingContext2D, p: Player, legSwing: number) {
  const c = p.color;
  const armSwing = Math.sin(p.walkCycle * 0.8) * 3;

  // Legs
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.lineTo(-3 - legSwing, 12);
  ctx.moveTo(3, 5);
  ctx.lineTo(3 + legSwing, 12);
  ctx.stroke();

  // Body
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 11, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-4, 1, 8, 4);

  // Arms
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-8, 4 + armSwing);
  ctx.moveTo(5, 0);
  ctx.lineTo(8, 4 - armSwing);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#ddb89a';
  ctx.beginPath();
  ctx.arc(0, -9, 5, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -11, 4, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  const ex = p.facingX * 1.5;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-2 + ex, -9, 1, 0, Math.PI * 2);
  ctx.arc(2 + ex, -9, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawClimbingBody(ctx: CanvasRenderingContext2D, p: Player) {
  const c = p.color;
  const prog = p.climbProgress;

  // Arms reaching up
  const reach = -8 - Math.sin(prog * Math.PI) * 6;
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-6, reach);
  ctx.moveTo(5, 0);
  ctx.lineTo(6, reach);
  ctx.stroke();

  // Body
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 11, 2);
  ctx.fill();

  // Legs dangling
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.lineTo(-4, 11 + Math.sin(prog * Math.PI * 2) * 3);
  ctx.moveTo(3, 5);
  ctx.lineTo(4, 11 - Math.sin(prog * Math.PI * 2) * 3);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#ddb89a';
  ctx.beginPath();
  ctx.arc(0, -9, 5, 0, Math.PI * 2);
  ctx.fill();

  // Effort expression
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-2, -9, 0.8, 0, Math.PI * 2);
  ctx.arc(2, -9, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(0, -7, 2, 0, Math.PI);
  ctx.stroke();
}

// ── Zombie ──

function drawZombie(ctx: CanvasRenderingContext2D, z: Zombie, t: number, visualElev: number) {
  const cx = z.position.x + z.size.width / 2;
  const cy = z.position.y + z.size.height / 2;
  const sy = cy - visualElev * EO;
  const bob = z.isClimbing ? 0 : Math.sin(z.walkCycle) * 0.8;

  const tierScale = z.tier === 0 ? 1.0 : z.tier === 1 ? 1.5 : 2.2;

  ctx.save();
  ctx.translate(cx, sy + bob);

  // Merge flash
  if (z.mergeTimer > 0) {
    ctx.strokeStyle = `rgba(200,80,255,${z.mergeTimer * 2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * tierScale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 9 * tierScale + visualElev * EO, 6 * tierScale, 2.5 * tierScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(tierScale, tierScale);
  drawZombieBody(ctx, z, t);
  ctx.restore();

  ctx.restore();
}

function drawZombieBody(ctx: CanvasRenderingContext2D, z: Zombie, t: number) {
  const legSwing = Math.sin(z.walkCycle) * 2.5;

  const skinH = z.tier === 0 ? 100 : z.tier === 1 ? 50 : 280;
  const skinS = z.tier === 2 ? 20 : 25;
  const skinL = z.tier === 0 ? 45 : z.tier === 1 ? 35 : 22;
  const skinColor = `hsl(${skinH},${skinS}%,${skinL}%)`;

  const clothL = z.tier === 0 ? 20 : z.tier === 1 ? 14 : 8;
  const clothColor = `hsl(0,15%,${clothL}%)`;

  // Legs
  ctx.strokeStyle = clothColor;
  ctx.lineWidth = z.tier >= 1 ? 3 : 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-4 - legSwing, 10);
  ctx.moveTo(3, 4);
  ctx.lineTo(4 + legSwing, 10);
  ctx.stroke();

  // Body
  ctx.fillStyle = clothColor;
  const bw = z.tier >= 1 ? 10 : 8;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -3, bw, 8, 2);
  ctx.fill();

  // Muscle / vein detail for big zombies
  if (z.tier >= 1) {
    ctx.fillStyle = `rgba(${z.tier === 2 ? '80,30,80' : '60,30,20'},0.3)`;
    ctx.fillRect(-bw / 2 + 1, -2, bw - 2, 4);
  }

  // Head
  ctx.fillStyle = skinColor;
  const headR = z.tier >= 1 ? 5 : 4.5;
  ctx.beginPath();
  ctx.arc(0, -7, headR, 0, Math.PI * 2);
  ctx.fill();

  // Arms reaching
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = z.tier >= 1 ? 3 : 2;
  const reach = 3 + Math.sin(z.walkCycle * 0.6) * 2;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, -1);
  ctx.lineTo(-bw / 2 - 1 - reach * 0.4, -3 + Math.sin(z.walkCycle) * 1.5);
  ctx.moveTo(bw / 2, -1);
  ctx.lineTo(bw / 2 + 1 + reach * 0.4, -3 - Math.sin(z.walkCycle) * 1.5);
  ctx.stroke();

  // Eyes
  const glowR = z.tier === 0 ? 1.5 : z.tier === 1 ? 2 : 2.5;
  const glowIntensity = z.tier === 0 ? 3 : z.tier === 1 ? 5 : 8;
  ctx.fillStyle = z.tier === 2 ? '#ff0000' : '#ff2222';
  ctx.shadowBlur = glowIntensity;
  ctx.shadowColor = '#ff0000';
  ctx.beginPath();
  ctx.arc(-2, -8, glowR, 0, Math.PI * 2);
  ctx.arc(2, -8, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Huge zombie aura
  if (z.tier === 2) {
    ctx.strokeStyle = `rgba(200,50,50,${0.2 + Math.sin(t * 5) * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Util ──

function tileHash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) >>> 0;
}
