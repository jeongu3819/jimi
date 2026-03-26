import { Player, Position, TileType, GameMap } from '../types';

const PLAYER_SIZE = 22;
const PLAYER_BASE_SPEED = 155;
const CLIMB_DURATION = 0.6;
const PLAYER_COLORS = ['#4a9eff', '#44dd55', '#ff77aa', '#ffaa33', '#cc88ff'];

export function createPlayer(
  spawnPos: Position, tileSize: number, name: string, index: number
): Player {
  return {
    id: `player_${index}`,
    name,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    position: {
      x: spawnPos.x * tileSize + tileSize / 2 - PLAYER_SIZE / 2,
      y: spawnPos.y * tileSize + tileSize / 2 - PLAYER_SIZE / 2,
    },
    size: { width: PLAYER_SIZE, height: PLAYER_SIZE },
    speed: PLAYER_BASE_SPEED,
    baseSpeed: PLAYER_BASE_SPEED,
    alive: true,
    elevation: 0,
    isClimbing: false,
    climbProgress: 0,
    climbFrom: { x: 0, y: 0 },
    climbTo: { x: 0, y: 0 },
    climbTargetElevation: 0,
    facingAngle: 0,
    facingX: 0,
    facingY: 1,
    walkCycle: 0,
    deathTime: 0,
    playerIndex: index,
    damageFlash: 0,
  };
}

export function updatePlayer(
  player: Player, dx: number, dy: number, dt: number, map: GameMap
): Player {
  if (!player.alive) return player;
  const p = { ...player };

  if (p.damageFlash > 0) p.damageFlash -= dt;

  // Climbing animation
  if (p.isClimbing) {
    p.climbProgress += dt / CLIMB_DURATION;
    if (p.climbProgress >= 1) {
      p.isClimbing = false;
      p.climbProgress = 0;
      p.position = { ...p.climbTo };
      p.elevation = p.climbTargetElevation;
    } else {
      const t = p.climbProgress;
      p.position = {
        x: p.climbFrom.x + (p.climbTo.x - p.climbFrom.x) * t,
        y: p.climbFrom.y + (p.climbTo.y - p.climbFrom.y) * t,
      };
    }
    return p;
  }

  if (dx !== 0 || dy !== 0) {
    p.facingX = dx;
    p.facingY = dy;
    p.facingAngle = Math.atan2(dy, dx);
    p.walkCycle += dt * 10;
  }

  p.speed = p.baseSpeed;
  const ts = map.tileSize;

  // Move X
  const moveX = dx * p.speed * dt;
  if (moveX !== 0) {
    const nx = p.position.x + moveX;
    if (!collidesMap(nx, p.position.y, p.size.width, p.size.height, map, p.elevation)) {
      p.position.x = nx;
    } else if (tryStartClimb(p, dx, 0, map, ts)) {
      return p;
    }
  }

  // Move Y
  const moveY = dy * p.speed * dt;
  if (moveY !== 0) {
    const ny = p.position.y + moveY;
    if (!collidesMap(p.position.x, ny, p.size.width, p.size.height, map, p.elevation)) {
      p.position.y = ny;
    } else if (tryStartClimb(p, 0, dy, map, ts)) {
      return p;
    }
  }

  // Update elevation after move (drop down if on lower tile)
  const centerCol = Math.floor((p.position.x + p.size.width / 2) / ts);
  const centerRow = Math.floor((p.position.y + p.size.height / 2) / ts);
  const tileH = getHeight(map, centerCol, centerRow);
  if (tileH < p.elevation) p.elevation = tileH;

  return p;
}

function tryStartClimb(p: Player, dx: number, dy: number, map: GameMap, ts: number): boolean {
  const cx = p.position.x + p.size.width / 2;
  const cy = p.position.y + p.size.height / 2;
  const col = Math.floor(cx / ts) + (dx > 0 ? 1 : dx < 0 ? -1 : 0);
  const row = Math.floor(cy / ts) + (dy > 0 ? 1 : dy < 0 ? -1 : 0);

  if (col < 0 || col >= map.cols || row < 0 || row >= map.rows) return false;
  if (map.tiles[row][col] === TileType.WALL) return false;

  const targetH = map.heights[row][col];
  if (targetH === p.elevation + 1) {
    p.isClimbing = true;
    p.climbProgress = 0;
    p.climbFrom = { ...p.position };
    p.climbTo = {
      x: col * ts + ts / 2 - p.size.width / 2,
      y: row * ts + ts / 2 - p.size.height / 2,
    };
    p.climbTargetElevation = targetH;
    return true;
  }
  return false;
}

function getHeight(map: GameMap, col: number, row: number): number {
  if (col < 0 || col >= map.cols || row < 0 || row >= map.rows) return 0;
  return map.heights[row][col];
}

function collidesMap(
  x: number, y: number, w: number, h: number,
  map: GameMap, elevation: number
): boolean {
  const { tileSize, tiles, cols, rows, heights } = map;
  const pts = [
    { px: x + 2, py: y + 2 }, { px: x + w - 2, py: y + 2 },
    { px: x + 2, py: y + h - 2 }, { px: x + w - 2, py: y + h - 2 },
  ];
  for (const { px, py } of pts) {
    const col = Math.floor(px / tileSize);
    const row = Math.floor(py / tileSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return true;
    if (tiles[row][col] === TileType.WALL) return true;
    if (heights[row][col] > elevation) return true;
  }
  return false;
}
