import { Zombie, Position, Difficulty, GameMap, TileType, Player, ZombieTier } from '../types';

let zombieIdCounter = 0;

const BASE_SPEED: Record<Difficulty, number> = { easy: 45, normal: 65, hard: 90 };
const STUCK_THRESHOLD = 2;
const STUCK_LIMIT = 0.6;
const ESCAPE_DUR = 0.5;

const TIER_SIZE: Record<ZombieTier, number> = { 0: 20, 1: 30, 2: 44 };
const TIER_SPEED_MULT: Record<ZombieTier, number> = { 0: 1.0, 1: 1.25, 2: 1.4 };
const TIER_CLIMB_DURATION: Record<ZombieTier, number> = { 0: 999, 1: 1.0, 2: 0.8 };
const TIER_MAX_CLIMB: Record<ZombieTier, number> = { 0: 0, 1: 1, 2: 2 };

export function createZombie(
  pos: Position, tileSize: number, difficulty: Difficulty, tier: ZombieTier = 0
): Zombie {
  const size = TIER_SIZE[tier];
  const speed = BASE_SPEED[difficulty] * TIER_SPEED_MULT[tier];
  return {
    id: `zombie_${zombieIdCounter++}`,
    position: {
      x: pos.x * tileSize + tileSize / 2 - size / 2,
      y: pos.y * tileSize + tileSize / 2 - size / 2,
    },
    size: { width: size, height: size },
    speed,
    baseSpeed: speed,
    alive: true,
    tier,
    elevation: 0,
    isClimbing: false,
    climbProgress: 0,
    climbFrom: { x: 0, y: 0 },
    climbTo: { x: 0, y: 0 },
    climbTargetElevation: 0,
    walkCycle: Math.random() * Math.PI * 2,
    facingX: 0,
    facingY: 1,
    prevPosition: { x: 0, y: 0 },
    stuckTime: 0,
    escapeAngle: 0,
    escapeTimer: 0,
    mergeTimer: 0,
  };
}

export function updateZombie(
  zombie: Zombie, players: Player[], dt: number,
  map: GameMap, allZombies: Zombie[]
): Zombie {
  if (!zombie.alive) return zombie;
  const z = { ...zombie };
  z.walkCycle += dt * 7;

  const ts = map.tileSize;
  const zcx = z.position.x + z.size.width / 2;
  const zcy = z.position.y + z.size.height / 2;

  // Climbing
  if (z.isClimbing) {
    const dur = TIER_CLIMB_DURATION[z.tier];
    z.climbProgress += dt / dur;
    if (z.climbProgress >= 1) {
      z.isClimbing = false;
      z.climbProgress = 0;
      z.position = { ...z.climbTo };
      z.elevation = z.climbTargetElevation;
    } else {
      const t = z.climbProgress;
      z.position = {
        x: z.climbFrom.x + (z.climbTo.x - z.climbFrom.x) * t,
        y: z.climbFrom.y + (z.climbTo.y - z.climbFrom.y) * t,
      };
    }
    return z;
  }

  // Merge effect timer
  if (z.mergeTimer > 0) z.mergeTimer -= dt;

  // Find closest alive player
  let closestPlayer: Player | null = null;
  let closestDist = Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const dx = (p.position.x + p.size.width / 2) - zcx;
    const dy = (p.position.y + p.size.height / 2) - zcy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < closestDist) { closestDist = d; closestPlayer = p; }
  }
  if (!closestPlayer) return z;

  const pcx = closestPlayer.position.x + closestPlayer.size.width / 2;
  const pcy = closestPlayer.position.y + closestPlayer.size.height / 2;

  // Stuck detection
  const movedDist = Math.sqrt(
    (z.position.x - z.prevPosition.x) ** 2 + (z.position.y - z.prevPosition.y) ** 2
  );
  if (movedDist < STUCK_THRESHOLD * dt * 60 && z.escapeTimer <= 0) {
    z.stuckTime += dt;
  } else if (z.escapeTimer <= 0) {
    z.stuckTime = 0;
  }
  z.prevPosition = { ...z.position };

  // Try climbing when stuck and player is higher
  if (z.stuckTime > 0.3 && closestPlayer.elevation > z.elevation) {
    const maxClimb = TIER_MAX_CLIMB[z.tier];
    if (maxClimb > z.elevation) {
      const currentCol = Math.floor(zcx / ts);
      const currentRow = Math.floor(zcy / ts);
      const dirs = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      ];
      for (const d of dirs) {
        const nc = currentCol + d.dx;
        const nr = currentRow + d.dy;
        if (nc < 0 || nc >= map.cols || nr < 0 || nr >= map.rows) continue;
        if (map.tiles[nr][nc] === TileType.WALL) continue;
        if (map.heights[nr][nc] === z.elevation + 1) {
          z.isClimbing = true;
          z.climbProgress = 0;
          z.climbFrom = { ...z.position };
          z.climbTo = {
            x: nc * ts + ts / 2 - z.size.width / 2,
            y: nr * ts + ts / 2 - z.size.height / 2,
          };
          z.climbTargetElevation = z.elevation + 1;
          z.stuckTime = 0;
          return z;
        }
      }
    }
  }

  // Escape mode
  if (z.escapeTimer > 0) {
    z.escapeTimer -= dt;
    const ex = Math.cos(z.escapeAngle) * z.speed * dt;
    const ey = Math.sin(z.escapeAngle) * z.speed * dt;
    tryMove(z, ex, ey, map);
    updateFacing(z);
    return z;
  }

  if (z.stuckTime >= STUCK_LIMIT) {
    z.stuckTime = 0;
    z.escapeTimer = ESCAPE_DUR;
    const base = Math.atan2(pcy - zcy, pcx - zcx);
    z.escapeAngle = base + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    return z;
  }

  // Move toward player
  let dx = pcx - zcx;
  let dy = pcy - zcy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return z;
  dx /= dist;
  dy /= dist;

  const moveX = dx * z.speed * dt;
  const moveY = dy * z.speed * dt;
  tryMove(z, moveX, moveY, map);

  // Update elevation (drop down if on lower tile)
  const newCol = Math.floor((z.position.x + z.size.width / 2) / ts);
  const newRow = Math.floor((z.position.y + z.size.height / 2) / ts);
  const tileH = map.heights[newRow]?.[newCol] ?? 0;
  if (tileH < z.elevation) z.elevation = tileH;

  // Separation from other zombies
  for (const other of allZombies) {
    if (other.id === z.id || !other.alive) continue;
    const ox = other.position.x + other.size.width / 2;
    const oy = other.position.y + other.size.height / 2;
    const sdx = zcx - ox;
    const sdy = zcy - oy;
    const sd = Math.sqrt(sdx * sdx + sdy * sdy);
    const minDist = (z.size.width + other.size.width) / 3;
    if (sd < minDist && sd > 0) {
      z.position.x += (sdx / sd) * (minDist - sd) * 0.15;
      z.position.y += (sdy / sd) * (minDist - sd) * 0.15;
    }
  }

  updateFacing(z);
  return z;
}

function tryMove(z: Zombie, mx: number, my: number, map: GameMap) {
  const nx = z.position.x + mx;
  if (!zombieCollides(nx, z.position.y, z.size.width, z.size.height, map, z.elevation)) {
    z.position.x = nx;
  } else {
    const slide = z.speed * 0.02;
    for (const sy of [slide, -slide]) {
      if (!zombieCollides(z.position.x, z.position.y + sy, z.size.width, z.size.height, map, z.elevation)) {
        z.position.y += sy;
        break;
      }
    }
  }
  const ny = z.position.y + my;
  if (!zombieCollides(z.position.x, ny, z.size.width, z.size.height, map, z.elevation)) {
    z.position.y = ny;
  } else {
    const slide = z.speed * 0.02;
    for (const sx of [slide, -slide]) {
      if (!zombieCollides(z.position.x + sx, z.position.y, z.size.width, z.size.height, map, z.elevation)) {
        z.position.x += sx;
        break;
      }
    }
  }
}

function zombieCollides(
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

export function checkZombiePlayerCollision(z: Zombie, p: Player): boolean {
  if (!z.alive || !p.alive) return false;

  // Elevation check — climbing players are vulnerable at both levels
  if (p.isClimbing) {
    if (z.elevation !== p.elevation && z.elevation !== p.climbTargetElevation) return false;
  } else {
    if (z.elevation !== p.elevation) return false;
  }

  const zcx = z.position.x + z.size.width / 2;
  const zcy = z.position.y + z.size.height / 2;
  const pcx = p.position.x + p.size.width / 2;
  const pcy = p.position.y + p.size.height / 2;
  const dx = zcx - pcx;
  const dy = zcy - pcy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const collisionDist = (z.size.width + p.size.width) / 4;
  return dist < collisionDist;
}

export function increaseZombieSpeed(z: Zombie, mul: number): Zombie {
  return { ...z, baseSpeed: z.baseSpeed * mul, speed: z.baseSpeed * mul };
}

function updateFacing(z: Zombie) {
  const dx = z.position.x - z.prevPosition.x;
  const dy = z.position.y - z.prevPosition.y;
  if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
    z.facingX = dx > 0 ? 1 : dx < 0 ? -1 : z.facingX;
    z.facingY = dy > 0 ? 1 : dy < 0 ? -1 : z.facingY;
  }
}
