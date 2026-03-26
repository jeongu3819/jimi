import { GameState, TileType, ItemType, Player, Zombie, VisionMode } from '../game/types';
import { ITEM_RENDER_SIZE } from '../game/entities/Item';

const COLORS = {
  floor: '#2a2a2a',
  wall: '#555555',
  box: '#8B6914',
  elevated: '#3a5a3a',
  elevatedBorder: '#4a7a4a',
  elevatedDanger: '#5a3a3a',
  itemSpeed: '#44ddff',
  itemSlow: '#ff77aa',
  gridLine: 'rgba(255,255,255,0.03)',
  web: '#bbbbdd',
  webCharge: 'rgba(187,187,221,0.3)',
};

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  const { map, players, zombies, items, projectiles, settings } = state;
  const canvasW = map.cols * map.tileSize;
  const canvasH = map.rows * map.tileSize;
  const t = state.survivalTime;

  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Draw tiles
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const tile = map.tiles[row][col];
      const x = col * map.tileSize;
      const y = row * map.tileSize;

      switch (tile) {
        case TileType.WALL:
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, map.tileSize - 2, map.tileSize - 2);
          ctx.beginPath();
          ctx.moveTo(x, y + map.tileSize / 2);
          ctx.lineTo(x + map.tileSize, y + map.tileSize / 2);
          ctx.stroke();
          break;
        case TileType.BOX:
          ctx.fillStyle = COLORS.box;
          ctx.fillRect(x + 1, y + 1, map.tileSize - 2, map.tileSize - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, map.tileSize - 4, map.tileSize - 4);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + map.tileSize - 4, y + map.tileSize - 4);
          ctx.moveTo(x + map.tileSize - 4, y + 4);
          ctx.lineTo(x + 4, y + map.tileSize - 4);
          ctx.stroke();
          break;
        case TileType.ELEVATED:
          ctx.fillStyle = COLORS.elevated;
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          ctx.strokeStyle = COLORS.elevatedBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, map.tileSize - 2, map.tileSize - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath();
          ctx.moveTo(x + map.tileSize / 2, y + 6);
          ctx.lineTo(x + map.tileSize - 8, y + map.tileSize - 6);
          ctx.lineTo(x + 8, y + map.tileSize - 6);
          ctx.closePath();
          ctx.fill();
          break;
        case TileType.ITEM_SPAWN:
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          break;
      }
    }
  }

  // Grid
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 0.5;
  for (let col = 0; col <= map.cols; col++) {
    ctx.beginPath();
    ctx.moveTo(col * map.tileSize, 0);
    ctx.lineTo(col * map.tileSize, canvasH);
    ctx.stroke();
  }
  for (let row = 0; row <= map.rows; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * map.tileSize);
    ctx.lineTo(canvasW, row * map.tileSize);
    ctx.stroke();
  }

  // Items
  for (const item of items) {
    if (item.collected) continue;
    const ix = item.position.x;
    const iy = item.position.y;
    const size = ITEM_RENDER_SIZE;
    ctx.shadowBlur = 8;
    ctx.shadowColor = item.type === ItemType.SPEED_BOOST ? COLORS.itemSpeed : COLORS.itemSlow;
    ctx.fillStyle = item.type === ItemType.SPEED_BOOST ? COLORS.itemSpeed : COLORS.itemSlow;
    ctx.beginPath();
    ctx.moveTo(ix + size / 2, iy);
    ctx.lineTo(ix + size, iy + size / 2);
    ctx.lineTo(ix + size / 2, iy + size);
    ctx.lineTo(ix, iy + size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.type === ItemType.SPEED_BOOST ? '\u26A1' : '\u2744', ix + size / 2, iy + size / 2);
  }
  ctx.shadowBlur = 0;

  // Web charge indicators
  for (const z of zombies) {
    if (z.webChargeTimer > 0 && z.webTargetDir) {
      const zcx = z.position.x + z.size.width / 2;
      const zcy = z.position.y + z.size.height / 2;
      ctx.strokeStyle = COLORS.webCharge;
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(zcx, zcy);
      ctx.lineTo(zcx + z.webTargetDir.x * 100, zcy + z.webTargetDir.y * 100);
      ctx.stroke();
      ctx.setLineDash([]);
      // Warning circle
      const pulse = 0.5 + Math.sin(t * 20) * 0.3;
      ctx.strokeStyle = `rgba(255,100,100,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zcx, zcy, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Projectiles
  for (const proj of projectiles) {
    ctx.fillStyle = COLORS.web;
    ctx.shadowBlur = 6;
    ctx.shadowColor = COLORS.web;
    ctx.beginPath();
    ctx.arc(proj.position.x, proj.position.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.strokeStyle = 'rgba(187,187,221,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(proj.position.x, proj.position.y);
    ctx.lineTo(proj.position.x - proj.velocity.x * 0.05, proj.position.y - proj.velocity.y * 0.05);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Zombies
  for (const zombie of zombies) {
    if (!zombie.alive) continue;
    drawZombie(ctx, zombie, t);
  }

  // Players
  for (const player of players) {
    if (!player.alive) continue;
    drawPlayer(ctx, player, t);
  }

  // Danger vignette
  const alivePlayers = players.filter(p => p.alive);
  for (const player of alivePlayers) {
    let closestDist = Infinity;
    for (const z of zombies) {
      const dx = z.position.x - player.position.x;
      const dy = z.position.y - player.position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) closestDist = d;
    }
    if (closestDist < 100) {
      const intensity = Math.max(0, 1 - closestDist / 100) * 0.25;
      const gradient = ctx.createRadialGradient(
        canvasW / 2, canvasH / 2, canvasW * 0.25,
        canvasW / 2, canvasH / 2, canvasW * 0.65
      );
      gradient.addColorStop(0, 'rgba(180, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(180, 0, 0, ${intensity})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
      break;
    }
  }

  // Blackout mode
  if (settings.visionMode === 'blackout') {
    drawBlackout(ctx, canvasW, canvasH, alivePlayers);
  }

  // Elevated warning for players staying too long
  for (const p of alivePlayers) {
    if (p.onElevated && p.elevatedTime > 3) {
      const warn = Math.min(1, (p.elevatedTime - 3) / 2);
      const px = p.position.x + p.size.width / 2;
      const py = p.position.y - 14;
      ctx.fillStyle = `rgba(255,80,80,${0.5 + Math.sin(t * 6) * 0.3})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('! DANGER !', px, py);
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, t: number) {
  const cx = player.position.x + player.size.width / 2;
  const cy = player.position.y + player.size.height / 2;
  const bob = Math.sin(player.walkCycle) * 1.5;
  const legSwing = Math.sin(player.walkCycle) * 4;

  const color = player.speedBoostTimer > 0 ? '#ffdd44' : player.color;

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shield effect
  if (player.shieldActive) {
    const pulse = 0.4 + Math.sin(t * 10) * 0.2;
    ctx.strokeStyle = `rgba(100,200,255,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(100,200,255,0.1)`;
    ctx.fill();
  }

  // Stun effect
  if (player.stunTimer > 0) {
    ctx.strokeStyle = `rgba(187,187,221,${0.5 + Math.sin(t * 15) * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = (t * 5 + i * 2.1) % (Math.PI * 2);
      const r = 14;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r - 2, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Slow effect
  if (player.slowTimer > 0) {
    ctx.fillStyle = `rgba(187,187,221,0.15)`;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-3 - legSwing, 11);
  ctx.moveTo(3, 4);
  ctx.lineTo(3 + legSwing, 11);
  ctx.stroke();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 10, 2);
  ctx.fill();

  // Head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  const armSwing = Math.sin(player.walkCycle + Math.PI) * 3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.lineTo(-9, 3 + armSwing);
  ctx.moveTo(5, -1);
  ctx.lineTo(9, 3 - armSwing);
  ctx.stroke();

  // Eyes
  const eyeDir = player.facingX;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2 + eyeDir, -9, 2, 0, Math.PI * 2);
  ctx.arc(2 + eyeDir, -9, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-2 + eyeDir * 0.8, -9, 1, 0, Math.PI * 2);
  ctx.arc(2 + eyeDir * 0.8, -9, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Name tag
  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, cx, cy - 18);

  // Elevated indicator
  if (player.onElevated) {
    ctx.strokeStyle = player.elevatedTime > 3 ? '#ff4444' : '#44ff44';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawZombie(ctx: CanvasRenderingContext2D, zombie: Zombie, t: number) {
  const cx = zombie.position.x + zombie.size.width / 2;
  const cy = zombie.position.y + zombie.size.height / 2;
  const bob = Math.sin(zombie.walkCycle) * 1;
  const legSwing = Math.sin(zombie.walkCycle) * 3;

  let bodyColor = '#883333';
  let skinColor = '#669966';
  if (zombie.slowTimer > 0) { bodyColor = '#664488'; skinColor = '#8866aa'; }
  else if (zombie.type === 'hard') { bodyColor = '#993333'; skinColor = '#558855'; }

  ctx.save();
  ctx.translate(cx, cy + bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (shambling)
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const stagger = Math.sin(zombie.walkCycle * 0.7) * 1.5;
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-4 - legSwing, 11 + stagger);
  ctx.moveTo(3, 4);
  ctx.lineTo(4 + legSwing, 11 - stagger);
  ctx.stroke();

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 10, 2);
  ctx.fill();

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Arms (reaching forward, zombie-style)
  const armReach = 4 + Math.sin(zombie.walkCycle * 0.5) * 2;
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.lineTo(-6 - armReach * 0.3, -3 + Math.sin(zombie.walkCycle) * 2);
  ctx.moveTo(5, -1);
  ctx.lineTo(6 + armReach * 0.3, -3 - Math.sin(zombie.walkCycle) * 2);
  ctx.stroke();

  // Eyes (glowing red)
  ctx.fillStyle = '#ff3333';
  ctx.shadowBlur = 4;
  ctx.shadowColor = '#ff0000';
  ctx.beginPath();
  ctx.arc(-2, -9, 2, 0, Math.PI * 2);
  ctx.arc(2, -9, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Web skill indicator
  if (zombie.hasWebSkill) {
    ctx.fillStyle = 'rgba(187,187,221,0.6)';
    ctx.beginPath();
    ctx.arc(0, -15, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBlackout(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  alivePlayers: Player[]
) {
  // Create dark overlay, then cut out circles around players
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Cut out light around each alive player
  ctx.globalCompositeOperation = 'destination-out';
  for (const p of alivePlayers) {
    const cx = p.position.x + p.size.width / 2;
    const cy = p.position.y + p.size.height / 2;
    const radius = 100;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Add a very faint layer so distant things are slightly visible
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, canvasW, canvasH);
}
