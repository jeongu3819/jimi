import { GameState, TileType, ItemType, Player, Zombie, BaseWall, VisionMode } from '../game/types';
import { ITEM_RENDER_SIZE } from '../game/entities/Item';

const PLAYER_COLORS_DARK: Record<string, string> = {
  '#4a9eff': '#2a5e99', '#44dd55': '#2a8833', '#ff77aa': '#993355',
  '#ffaa33': '#996622', '#cc88ff': '#774499',
};

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  const { map, players, zombies, bullets, items, baseWalls, settings } = state;
  const canvasW = map.cols * map.tileSize;
  const canvasH = map.rows * map.tileSize;
  const t = state.survivalTime;
  const ts = map.tileSize;

  // Floor
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Tiles
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const x = c * ts;
      const y = r * ts;
      if (map.tiles[r][c] === TileType.WALL) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, ts, ts);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
      } else {
        // Subtle floor grid
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, ts, ts);
      }
    }
  }

  // Base walls with ownership color
  const ownerColors: Record<number, string> = {};
  for (let bi = 0; bi < state.baseOwners.length; bi++) {
    const ownerId = state.baseOwners[bi];
    if (ownerId) {
      const owner = players.find(p => p.id === ownerId);
      if (owner) ownerColors[bi] = owner.color;
    }
  }

  for (const bw of baseWalls) {
    if (bw.destroyed) continue;
    const x = bw.tilePos.x * ts;
    const y = bw.tilePos.y * ts;
    const hpRatio = bw.hp / bw.maxHp;
    const ownerColor = ownerColors[bw.baseIndex];

    if (bw.isDoor) {
      const g = Math.floor(100 + hpRatio * 100);
      ctx.fillStyle = ownerColor ? hexToRgba(ownerColor, 0.3) : `rgb(40, 60, ${g})`;
      ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
      ctx.strokeStyle = ownerColor || `rgba(100, 150, 255, ${0.3 + hpRatio * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
      ctx.fillStyle = ownerColor ? hexToRgba(ownerColor, 0.2) : 'rgba(100,200,255,0.15)';
      ctx.fillRect(x + ts / 2 - 3, y + 2, 6, ts - 4);
    } else {
      if (ownerColor) {
        ctx.fillStyle = hexToRgba(ownerColor, 0.25 + hpRatio * 0.15);
        ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
        ctx.strokeStyle = hexToRgba(ownerColor, 0.5);
      } else {
        const rv = Math.floor(90 + (1 - hpRatio) * 50);
        ctx.fillStyle = `rgb(${rv}, ${Math.floor(60 * hpRatio) + 30}, 20)`;
        ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      }
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    }

    if (hpRatio < 1) {
      const barW = ts - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 2, y + ts - 5, barW, 3);
      ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc4444';
      ctx.fillRect(x + 2, y + ts - 5, barW * hpRatio, 3);
    }
  }

  // Base ownership labels
  for (let bi = 0; bi < state.map.baseConfigs.length; bi++) {
    const bc = state.map.baseConfigs[bi];
    const bx = bc.center.x * ts + ts / 2;
    const by = (bc.center.y - 2) * ts;
    const ownerId = state.baseOwners[bi];

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    if (ownerId) {
      const owner = players.find(p => p.id === ownerId);
      if (owner) {
        ctx.fillStyle = owner.color;
        ctx.fillText(owner.name, bx, by);
      }
    } else {
      const pulse = 0.3 + Math.sin(t * 3) * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      ctx.fillText('[ OPEN ]', bx, by);
    }
  }

  // Items
  for (const item of items) {
    if (item.collected) continue;
    const ix = item.position.x;
    const iy = item.position.y;
    const size = ITEM_RENDER_SIZE;

    // Blink when about to expire
    if (item.lifetime < 5 && Math.sin(t * 10) < 0) continue;

    let color = '#44ddff';
    let label = '?';
    switch (item.type) {
      case ItemType.GUN_DAMAGE: color = '#ff6644'; label = 'D'; break;
      case ItemType.GUN_RATE: color = '#ffaa22'; label = 'R'; break;
      case ItemType.WALL_REPAIR: color = '#44cc44'; label = 'W'; break;
      case ItemType.HEALTH_PACK: color = '#ff4488'; label = '+'; break;
    }

    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ix + size / 2, iy);
    ctx.lineTo(ix + size, iy + size / 2);
    ctx.lineTo(ix + size / 2, iy + size);
    ctx.lineTo(ix, iy + size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ix + size / 2, iy + size / 2);
  }

  // Bullets
  for (const b of bullets) {
    ctx.fillStyle = '#ffee88';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffee88';
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Zombies
  for (const z of zombies) {
    if (!z.alive) continue;
    drawZombie(ctx, z, t, ts);
  }

  // Players
  for (const p of players) {
    if (!p.alive) continue;
    drawPlayer(ctx, p, t);
  }

  // Danger vignette
  const alive = players.filter(p => p.alive);
  if (alive.length > 0) {
    let minDist = Infinity;
    for (const p of alive) {
      for (const z of zombies) {
        if (!z.alive) continue;
        const dx = z.position.x - p.position.x;
        const dy = z.position.y - p.position.y;
        minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
      }
    }
    if (minDist < 80) {
      const intensity = (1 - minDist / 80) * 0.2;
      const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.2, canvasW / 2, canvasH / 2, canvasW * 0.6);
      grad.addColorStop(0, 'rgba(180,0,0,0)');
      grad.addColorStop(1, `rgba(180,0,0,${intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  // Blackout
  if (settings.visionMode === 'blackout') {
    drawBlackout(ctx, canvasW, canvasH, alive);
  }

  // Wave indicator
  if (state.wave > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${state.wave}`, canvasW - 8, canvasH - 8);
  }

  // Prep countdown overlay
  if (state.prepTime > 0) {
    const sec = Math.ceil(state.prepTime);
    // Semi-transparent top banner
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvasW, 50);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main countdown number
    const scale = 1 + (state.prepTime % 1) * 0.15;
    ctx.save();
    ctx.translate(canvasW / 2, 25);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`${sec}`, 0, 0);
    ctx.restore();

    // Label
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('CLAIM YOUR BASE!', canvasW / 2, 48);

    // Pulsing border
    const borderAlpha = 0.2 + Math.sin(t * 6) * 0.1;
    ctx.strokeStyle = `rgba(255,170,68,${borderAlpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvasW - 4, canvasH - 4);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, t: number) {
  const cx = p.position.x + p.size.width / 2;
  const cy = p.position.y + p.size.height / 2;
  const bob = Math.sin(p.walkCycle) * 1.2;
  const legSwing = Math.sin(p.walkCycle) * 3.5;
  const color = p.speedBoostTimer > 0 ? '#ffdd44' : p.color;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Damage flash
  if (p.damageFlash > 0 && Math.sin(t * 30) > 0) {
    ctx.globalAlpha = 0.5;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shield
  if (p.shieldActive) {
    ctx.strokeStyle = `rgba(100,200,255,${0.4 + Math.sin(t * 10) * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Legs
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-3 - legSwing, 10);
  ctx.moveTo(3, 4);
  ctx.lineTo(3 + legSwing, 10);
  ctx.stroke();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-4, -4, 8, 9, 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -8, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Gun arm (toward facing angle)
  const gunAngle = p.facingAngle;
  const gunLen = 10;
  ctx.strokeStyle = PLAYER_COLORS_DARK[p.color] || '#555';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(gunAngle) * gunLen, Math.sin(gunAngle) * gunLen);
  ctx.stroke();
  // Gun tip
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(Math.cos(gunAngle) * gunLen, Math.sin(gunAngle) * gunLen, 2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2, -9, 1.8, 0, Math.PI * 2);
  ctx.arc(2, -9, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();

  // Name
  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, cx, cy - 16);

  // HP bar
  const barW = 20;
  const hpRatio = p.hp / p.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cx - barW / 2, cy - 20, barW, 3);
  ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc4444';
  ctx.fillRect(cx - barW / 2, cy - 20, barW * hpRatio, 3);

  // Shield indicator
  if (p.shieldAvailable) {
    ctx.fillStyle = 'rgba(100,200,255,0.6)';
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZombie(ctx: CanvasRenderingContext2D, z: Zombie, t: number, ts: number) {
  const cx = z.position.x + z.size.width / 2;
  const cy = z.position.y + z.size.height / 2;
  const bob = Math.sin(z.walkCycle) * 0.8;
  const legSwing = Math.sin(z.walkCycle) * 2.5;

  const bodyColor = '#883333';
  const skinColor = z.type === 'hard' ? '#447744' : '#669966';

  ctx.save();
  ctx.translate(cx, cy + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Attacking indicator
  if (z.targetWallId) {
    ctx.strokeStyle = `rgba(255,100,50,${0.3 + Math.sin(t * 8) * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-4 - legSwing, 10);
  ctx.moveTo(3, 4);
  ctx.lineTo(4 + legSwing, 10);
  ctx.stroke();

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-4, -3, 8, 8, 2);
  ctx.fill();

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -7, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Arms reaching
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 2;
  const armReach = 3 + Math.sin(z.walkCycle * 0.6) * 2;
  ctx.beginPath();
  ctx.moveTo(-4, -1);
  ctx.lineTo(-5 - armReach * 0.3, -2 + Math.sin(z.walkCycle) * 1.5);
  ctx.moveTo(4, -1);
  ctx.lineTo(5 + armReach * 0.3, -2 - Math.sin(z.walkCycle) * 1.5);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#ff2222';
  ctx.shadowBlur = 3;
  ctx.shadowColor = '#ff0000';
  ctx.beginPath();
  ctx.arc(-2, -8, 1.5, 0, Math.PI * 2);
  ctx.arc(2, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // HP bar for damaged zombies
  if (z.hp < z.maxHp) {
    const barW = 16;
    const hpR = z.hp / z.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-barW / 2, -14, barW, 2);
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(-barW / 2, -14, barW * hpR, 2);
  }

  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawBlackout(ctx: CanvasRenderingContext2D, cw: number, ch: number, alive: Player[]) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'destination-out';
  for (const p of alive) {
    const cx = p.position.x + p.size.width / 2;
    const cy = p.position.y + p.size.height / 2;
    const r = 110;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
