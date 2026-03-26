import { Zombie, Position, Difficulty, GameMap, TileType, Player, BaseWall } from '../types';

let zombieIdCounter = 0;

const ZOMBIE_SIZE = 20;
const SPEED: Record<Difficulty, number> = { easy: 55, normal: 80, hard: 110 };
const HP: Record<Difficulty, number> = { easy: 30, normal: 50, hard: 80 };
const WALL_DMG: Record<Difficulty, number> = { easy: 8, normal: 14, hard: 22 };
const PLAYER_DMG: Record<Difficulty, number> = { easy: 10, normal: 15, hard: 22 };
const ATTACK_RATE = 0.8;

const STUCK_THRESHOLD = 2;
const STUCK_LIMIT = 0.6;
const ESCAPE_DUR = 0.5;

export function createZombie(pos: Position, tileSize: number, difficulty: Difficulty): Zombie {
  return {
    id: `zombie_${zombieIdCounter++}`,
    position: {
      x: pos.x * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
      y: pos.y * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
    },
    size: { width: ZOMBIE_SIZE, height: ZOMBIE_SIZE },
    speed: SPEED[difficulty],
    baseSpeed: SPEED[difficulty],
    alive: true,
    hp: HP[difficulty],
    maxHp: HP[difficulty],
    type: difficulty,
    targetWallId: null,
    attackCooldown: 0,
    walkCycle: Math.random() * Math.PI * 2,
    facingX: 0, facingY: 1,
    prevPosition: { x: 0, y: 0 },
    stuckTime: 0,
    escapeAngle: 0,
    escapeTimer: 0,
  };
}

export function getZombieAttackDamage(z: Zombie): number {
  return WALL_DMG[z.type];
}

export function getZombiePlayerDamage(z: Zombie): number {
  return PLAYER_DMG[z.type];
}

export function updateZombie(
  zombie: Zombie, players: Player[], dt: number,
  map: GameMap, baseWalls: BaseWall[], allZombies: Zombie[]
): Zombie {
  if (!zombie.alive) return zombie;
  const z = { ...zombie };
  z.walkCycle += dt * 7;
  if (z.attackCooldown > 0) z.attackCooldown -= dt;

  const zcx = z.position.x + z.size.width / 2;
  const zcy = z.position.y + z.size.height / 2;

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

  // Check if adjacent to a base wall (attack it)
  const tileSize = map.tileSize;
  const zTileX = Math.floor(zcx / tileSize);
  const zTileY = Math.floor(zcy / tileSize);

  let adjacentWall: BaseWall | null = null;
  for (const bw of baseWalls) {
    if (bw.destroyed) continue;
    const dx = Math.abs(bw.tilePos.x - zTileX);
    const dy = Math.abs(bw.tilePos.y - zTileY);
    if ((dx <= 1 && dy === 0) || (dx === 0 && dy <= 1)) {
      // Check if wall is between zombie and player
      adjacentWall = bw;
      z.targetWallId = bw.id;
      break;
    }
  }

  // If adjacent to wall, attack it
  if (adjacentWall && z.attackCooldown <= 0) {
    // Will be handled by engine (returns the zombie with target set)
    // Just stop moving and face the wall
    z.facingX = adjacentWall.tilePos.x * tileSize + tileSize / 2 > zcx ? 1 : -1;
    z.facingY = adjacentWall.tilePos.y * tileSize + tileSize / 2 > zcy ? 1 : -1;
    return z;
  }

  z.targetWallId = null;

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

  // Escape mode
  if (z.escapeTimer > 0) {
    z.escapeTimer -= dt;
    const ex = Math.cos(z.escapeAngle) * z.speed * dt;
    const ey = Math.sin(z.escapeAngle) * z.speed * dt;
    tryMove(z, ex, ey, map, baseWalls);
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
  dx /= dist; dy /= dist;

  // Hard: predict
  if (z.type === 'hard') {
    dx += closestPlayer.facingX * 0.3;
    dy += closestPlayer.facingY * 0.3;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
  }

  const moveX = dx * z.speed * dt;
  const moveY = dy * z.speed * dt;
  tryMove(z, moveX, moveY, map, baseWalls);

  // Separation
  for (const other of allZombies) {
    if (other.id === z.id || !other.alive) continue;
    const ox = other.position.x + other.size.width / 2;
    const oy = other.position.y + other.size.height / 2;
    const sdx = zcx - ox;
    const sdy = zcy - oy;
    const sd = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sd < 16 && sd > 0) {
      z.position.x += (sdx / sd) * (16 - sd) * 0.2;
      z.position.y += (sdy / sd) * (16 - sd) * 0.2;
    }
  }

  updateFacing(z);
  return z;
}

function tryMove(z: Zombie, mx: number, my: number, map: GameMap, walls: BaseWall[]) {
  const nx = z.position.x + mx;
  if (!zombieCollides(nx, z.position.y, z.size.width, z.size.height, map, walls)) {
    z.position.x = nx;
  } else {
    // Wall slide
    const slide = z.speed * 0.02;
    for (const sy of [slide, -slide]) {
      if (!zombieCollides(z.position.x, z.position.y + sy, z.size.width, z.size.height, map, walls)) {
        z.position.y += sy;
        break;
      }
    }
  }
  const ny = z.position.y + my;
  if (!zombieCollides(z.position.x, ny, z.size.width, z.size.height, map, walls)) {
    z.position.y = ny;
  } else {
    const slide = z.speed * 0.02;
    for (const sx of [slide, -slide]) {
      if (!zombieCollides(z.position.x + sx, z.position.y, z.size.width, z.size.height, map, walls)) {
        z.position.x += sx;
        break;
      }
    }
  }
}

function zombieCollides(
  x: number, y: number, w: number, h: number,
  map: GameMap, baseWalls: BaseWall[]
): boolean {
  const { tileSize, tiles, cols, rows } = map;
  const pts = [
    { px: x + 2, py: y + 2 }, { px: x + w - 2, py: y + 2 },
    { px: x + 2, py: y + h - 2 }, { px: x + w - 2, py: y + h - 2 },
  ];
  for (const { px, py } of pts) {
    const col = Math.floor(px / tileSize);
    const row = Math.floor(py / tileSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return true;
    if (tiles[row][col] === TileType.WALL) return true;
    for (const bw of baseWalls) {
      if (bw.destroyed) continue;
      if (bw.tilePos.x === col && bw.tilePos.y === row) return true;
    }
  }
  return false;
}

export function checkZombiePlayerCollision(z: Zombie, p: Player): boolean {
  if (!z.alive || !p.alive || p.shieldActive) return false;
  return (
    z.position.x < p.position.x + p.size.width - 3 &&
    z.position.x + z.size.width - 3 > p.position.x &&
    z.position.y < p.position.y + p.size.height - 3 &&
    z.position.y + z.size.height - 3 > p.position.y
  );
}

function updateFacing(z: Zombie) {
  const dx = z.position.x - z.prevPosition.x;
  const dy = z.position.y - z.prevPosition.y;
  if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
    z.facingX = dx > 0 ? 1 : dx < 0 ? -1 : z.facingX;
    z.facingY = dy > 0 ? 1 : dy < 0 ? -1 : z.facingY;
  }
}

export function damageZombie(z: Zombie, dmg: number): Zombie {
  const hp = Math.max(0, z.hp - dmg);
  return { ...z, hp, alive: hp > 0 };
}

export function increaseZombieSpeed(z: Zombie, mul: number): Zombie {
  return { ...z, baseSpeed: z.baseSpeed * mul, speed: z.baseSpeed * mul };
}
