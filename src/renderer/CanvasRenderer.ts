import { GameState, TileType, ItemType } from '../game/types';
import { ITEM_RENDER_SIZE } from '../game/entities/Item';

const COLORS = {
  floor: '#2a2a2a',
  wall: '#555555',
  box: '#8B6914',
  elevated: '#3a5a3a',
  elevatedBorder: '#4a7a4a',
  player: '#4a9eff',
  playerGlow: 'rgba(74, 158, 255, 0.3)',
  playerBoosted: '#ffdd44',
  zombie: '#cc3333',
  zombieHard: '#ff4444',
  zombieSlowed: '#9944cc',
  itemSpeed: '#44ddff',
  itemSlow: '#ff77aa',
  gridLine: 'rgba(255,255,255,0.03)',
  dangerVignette: 'rgba(180, 0, 0, 0.15)',
};

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  const { map, player, zombies, items } = state;
  const canvasW = map.cols * map.tileSize;
  const canvasH = map.rows * map.tileSize;

  // Clear
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
          // Brick pattern
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
          // X pattern on box
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
          // Arrow up indicator
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.moveTo(x + map.tileSize / 2, y + 6);
          ctx.lineTo(x + map.tileSize - 8, y + map.tileSize - 6);
          ctx.lineTo(x + 8, y + map.tileSize - 6);
          ctx.closePath();
          ctx.fill();
          break;
        case TileType.ITEM_SPAWN:
          // Just draw floor with subtle marker
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          break;
      }
    }
  }

  // Grid lines
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

  // Draw items
  for (const item of items) {
    if (item.collected) continue;
    const ix = item.position.x;
    const iy = item.position.y;
    const size = ITEM_RENDER_SIZE;

    // Glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = item.type === ItemType.SPEED_BOOST ? COLORS.itemSpeed : COLORS.itemSlow;

    ctx.fillStyle = item.type === ItemType.SPEED_BOOST ? COLORS.itemSpeed : COLORS.itemSlow;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(ix + size / 2, iy);
    ctx.lineTo(ix + size, iy + size / 2);
    ctx.lineTo(ix + size / 2, iy + size);
    ctx.lineTo(ix, iy + size / 2);
    ctx.closePath();
    ctx.fill();

    // Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      item.type === ItemType.SPEED_BOOST ? '⚡' : '❄',
      ix + size / 2,
      iy + size / 2
    );
  }

  ctx.shadowBlur = 0;

  // Draw zombies
  for (const zombie of zombies) {
    if (!zombie.alive) continue;
    const zx = zombie.position.x;
    const zy = zombie.position.y;
    const zw = zombie.size.width;
    const zh = zombie.size.height;

    let color = COLORS.zombie;
    if (zombie.slowTimer > 0) color = COLORS.zombieSlowed;
    else if (zombie.type === 'hard') color = COLORS.zombieHard;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(zx + zw / 2, zy + zh / 2, zw / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(zx + zw / 2 - 4, zy + zh / 2 - 2, 3, 0, Math.PI * 2);
    ctx.arc(zx + zw / 2 + 4, zy + zh / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(zx + zw / 2 - 4, zy + zh / 2 - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(zx + zw / 2 + 4, zy + zh / 2 - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player
  if (player.alive) {
    const px = player.position.x;
    const py = player.position.y;
    const pw = player.size.width;
    const ph = player.size.height;

    // Glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = player.speedBoostTimer > 0 ? COLORS.playerBoosted : COLORS.playerGlow;

    ctx.fillStyle = player.speedBoostTimer > 0 ? COLORS.playerBoosted : COLORS.player;
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + ph / 2, pw / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Face
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + pw / 2 - 4, py + ph / 2 - 3, 3, 0, Math.PI * 2);
    ctx.arc(px + pw / 2 + 4, py + ph / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(px + pw / 2 - 4, py + ph / 2 - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(px + pw / 2 + 4, py + ph / 2 - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Elevated indicator
    if (player.onElevated) {
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, pw / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Danger vignette when zombies are close
  if (player.alive) {
    let closestDist = Infinity;
    for (const z of zombies) {
      const dx = z.position.x - player.position.x;
      const dy = z.position.y - player.position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) closestDist = d;
    }

    if (closestDist < 120) {
      const intensity = Math.max(0, 1 - closestDist / 120) * 0.3;
      const gradient = ctx.createRadialGradient(
        canvasW / 2, canvasH / 2, canvasW * 0.3,
        canvasW / 2, canvasH / 2, canvasW * 0.7
      );
      gradient.addColorStop(0, 'rgba(180, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(180, 0, 0, ${intensity})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }
}
