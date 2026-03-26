import { Zombie, Projectile, Position, Difficulty, GameMap, TileType, Player } from '../types';

let zombieIdCounter = 0;
let projectileIdCounter = 0;

const ZOMBIE_SIZE = 22;

const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 70,
  normal: 105,
  hard: 135,
};

const STUCK_THRESHOLD = 3;      // pixels moved threshold
const STUCK_TIME_LIMIT = 0.8;   // seconds before escape
const ESCAPE_DURATION = 0.6;    // seconds of escape movement

const WEB_COOLDOWN: Record<Difficulty, number> = { easy: 999, normal: 10, hard: 6 };
const WEB_RANGE = 180;
const WEB_CHARGE_TIME = 0.8;
const WEB_SPEED = 250;
const WEB_LIFETIME = 1.2;

export function createZombie(
  spawnPos: Position,
  tileSize: number,
  difficulty: Difficulty
): Zombie {
  const baseSpeed = SPEED_BY_DIFFICULTY[difficulty];
  const hasWeb = difficulty !== 'easy' && Math.random() < (difficulty === 'hard' ? 0.5 : 0.25);
  return {
    id: `zombie_${zombieIdCounter++}`,
    position: {
      x: spawnPos.x * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
      y: spawnPos.y * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
    },
    size: { width: ZOMBIE_SIZE, height: ZOMBIE_SIZE },
    speed: baseSpeed,
    baseSpeed,
    alive: true,
    type: difficulty,
    canClimb: difficulty === 'hard',
    slowTimer: 0,
    prevPosition: {
      x: spawnPos.x * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
      y: spawnPos.y * tileSize + tileSize / 2 - ZOMBIE_SIZE / 2,
    },
    stuckTime: 0,
    escapeAngle: 0,
    escapeTimer: 0,
    hasWebSkill: hasWeb,
    webCooldown: Math.random() * 3 + 2, // stagger initial cooldowns
    webChargeTimer: 0,
    webTargetDir: null,
    walkCycle: Math.random() * Math.PI * 2,
    facingX: 0,
    facingY: 1,
  };
}

export function updateZombie(
  zombie: Zombie,
  players: Player[],
  dt: number,
  map: GameMap,
  allZombies: Zombie[]
): { zombie: Zombie; newProjectile: Projectile | null } {
  if (!zombie.alive) return { zombie, newProjectile: null };

  const updated = { ...zombie };
  let newProjectile: Projectile | null = null;

  // Find closest alive player
  const target = findClosestPlayer(updated, players);
  if (!target) return { zombie: updated, newProjectile: null };

  // Update slow timer
  if (updated.slowTimer > 0) {
    updated.slowTimer -= dt;
    if (updated.slowTimer <= 0) {
      updated.slowTimer = 0;
      updated.speed = updated.baseSpeed;
    } else {
      updated.speed = updated.baseSpeed * 0.4;
    }
  }

  // Web skill cooldown
  if (updated.webCooldown > 0) updated.webCooldown -= dt;

  // Walk cycle
  updated.walkCycle += dt * 8;

  const playerCX = target.position.x + target.size.width / 2;
  const playerCY = target.position.y + target.size.height / 2;
  const zombieCX = updated.position.x + updated.size.width / 2;
  const zombieCY = updated.position.y + updated.size.height / 2;
  const distToPlayer = Math.sqrt((playerCX - zombieCX) ** 2 + (playerCY - zombieCY) ** 2);

  // Web charging
  if (updated.webChargeTimer > 0) {
    updated.webChargeTimer -= dt;
    if (updated.webChargeTimer <= 0 && updated.webTargetDir) {
      // Fire web!
      const dir = updated.webTargetDir;
      newProjectile = {
        id: `proj_${projectileIdCounter++}`,
        position: { x: zombieCX - 4, y: zombieCY - 4 },
        velocity: { x: dir.x * WEB_SPEED, y: dir.y * WEB_SPEED },
        lifetime: WEB_LIFETIME,
        type: 'web',
      };
      updated.webCooldown = WEB_COOLDOWN[updated.type];
      updated.webTargetDir = null;
    }
    return { zombie: updated, newProjectile };
  }

  // Try to use web skill
  if (updated.hasWebSkill && updated.webCooldown <= 0 && distToPlayer < WEB_RANGE && distToPlayer > 40) {
    const dx = playerCX - zombieCX;
    const dy = playerCY - zombieCY;
    const len = Math.sqrt(dx * dx + dy * dy);
    updated.webChargeTimer = WEB_CHARGE_TIME;
    updated.webTargetDir = { x: dx / len, y: dy / len };
    return { zombie: updated, newProjectile: null };
  }

  // If target is on elevated and zombie can't climb, try to get close and wait
  const targetOnElevated = target.onElevated && !updated.canClimb;

  // Stuck detection
  const movedDist = Math.sqrt(
    (updated.position.x - updated.prevPosition.x) ** 2 +
    (updated.position.y - updated.prevPosition.y) ** 2
  );
  if (movedDist < STUCK_THRESHOLD * dt * 60 && updated.escapeTimer <= 0) {
    updated.stuckTime += dt;
  } else if (updated.escapeTimer <= 0) {
    updated.stuckTime = 0;
  }
  updated.prevPosition = { ...updated.position };

  // Escape mode
  if (updated.escapeTimer > 0) {
    updated.escapeTimer -= dt;
    const ex = Math.cos(updated.escapeAngle) * updated.speed * dt;
    const ey = Math.sin(updated.escapeAngle) * updated.speed * dt;
    const newX = updated.position.x + ex;
    if (!zombieCollidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
      updated.position.x = newX;
    }
    const newY = updated.position.y + ey;
    if (!zombieCollidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map, updated.canClimb)) {
      updated.position.y = newY;
    }
    updateFacing(updated);
    return { zombie: updated, newProjectile: null };
  }

  // Trigger escape if stuck
  if (updated.stuckTime >= STUCK_TIME_LIMIT) {
    updated.stuckTime = 0;
    updated.escapeTimer = ESCAPE_DURATION;
    // Try perpendicular directions
    const baseAngle = Math.atan2(playerCY - zombieCY, playerCX - zombieCX);
    updated.escapeAngle = baseAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    return { zombie: updated, newProjectile: null };
  }

  // Normal movement toward player
  let dx = playerCX - zombieCX;
  let dy = playerCY - zombieCY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { zombie: updated, newProjectile: null };

  dx /= dist;
  dy /= dist;

  if (targetOnElevated) {
    // Move toward elevated area but wander near it
    const angle = Math.sin(Date.now() * 0.002 + parseInt(zombie.id.split('_')[1]) * 1.7) * 0.8;
    dx = Math.cos(Math.atan2(dy, dx) + angle);
    dy = Math.sin(Math.atan2(dy, dx) + angle);
  }

  // Hard: predict player movement
  if (updated.type === 'hard') {
    dx += target.facingX * 0.35;
    dy += target.facingY * 0.35;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
  } else if (updated.type === 'normal') {
    dx += (Math.random() - 0.5) * 0.15;
    dy += (Math.random() - 0.5) * 0.15;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
  }

  const moveX = dx * updated.speed * dt;
  const moveY = dy * updated.speed * dt;

  // Try X
  const newX = updated.position.x + moveX;
  if (!zombieCollidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.x = newX;
  } else {
    // Wall slide - try both perpendicular directions
    const slideAmount = updated.speed * dt * 0.7;
    const trySlides = [
      { x: 0, y: slideAmount * (dy >= 0 ? 1 : -1) },
      { x: 0, y: slideAmount * (dy >= 0 ? -1 : 1) },
    ];
    for (const slide of trySlides) {
      const sy = updated.position.y + slide.y;
      if (!zombieCollidesWithMap(updated.position.x, sy, updated.size.width, updated.size.height, map, updated.canClimb)) {
        updated.position.y = sy;
        break;
      }
    }
  }

  // Try Y
  const newY = updated.position.y + moveY;
  if (!zombieCollidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.y = newY;
  } else {
    const slideAmount = updated.speed * dt * 0.7;
    const trySlides = [
      { x: slideAmount * (dx >= 0 ? 1 : -1), y: 0 },
      { x: slideAmount * (dx >= 0 ? -1 : 1), y: 0 },
    ];
    for (const slide of trySlides) {
      const sx = updated.position.x + slide.x;
      if (!zombieCollidesWithMap(sx, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
        updated.position.x = sx;
        break;
      }
    }
  }

  // Separation from other zombies
  for (const other of allZombies) {
    if (other.id === updated.id) continue;
    const ox = other.position.x + other.size.width / 2;
    const oy = other.position.y + other.size.height / 2;
    const ux = updated.position.x + updated.size.width / 2;
    const uy = updated.position.y + updated.size.height / 2;
    const sdx = ux - ox;
    const sdy = uy - oy;
    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sDist < 18 && sDist > 0) {
      const push = (18 - sDist) * 0.3;
      updated.position.x += (sdx / sDist) * push;
      updated.position.y += (sdy / sDist) * push;
    }
  }

  updateFacing(updated);

  return { zombie: updated, newProjectile };
}

function updateFacing(z: Zombie) {
  const dx = z.position.x - z.prevPosition.x;
  const dy = z.position.y - z.prevPosition.y;
  if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    z.facingX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    z.facingY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  }
}

function findClosestPlayer(zombie: Zombie, players: Player[]): Player | null {
  let closest: Player | null = null;
  let closestDist = Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const dx = p.position.x - zombie.position.x;
    const dy = p.position.y - zombie.position.y;
    const d = dx * dx + dy * dy;
    if (d < closestDist) {
      closestDist = d;
      closest = p;
    }
  }
  return closest;
}

export function applySlowToZombie(zombie: Zombie): Zombie {
  return { ...zombie, slowTimer: 3 };
}

function zombieCollidesWithMap(
  x: number, y: number, w: number, h: number,
  map: GameMap, canClimb: boolean
): boolean {
  const { tileSize, tiles, cols, rows } = map;
  const checkPoints = [
    { px: x + 2, py: y + 2 },
    { px: x + w - 2, py: y + 2 },
    { px: x + 2, py: y + h - 2 },
    { px: x + w - 2, py: y + h - 2 },
  ];

  for (const { px, py } of checkPoints) {
    const col = Math.floor(px / tileSize);
    const row = Math.floor(py / tileSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return true;
    const tile = tiles[row][col];
    if (tile === TileType.WALL || tile === TileType.BOX) return true;
    if (tile === TileType.ELEVATED && !canClimb) return true;
  }

  return false;
}

export function checkZombiePlayerCollision(zombie: Zombie, player: Player): boolean {
  if (!zombie.alive || !player.alive) return false;
  if (player.shieldActive) return false;
  // Player on elevated and zombie can't climb = safe (unless overstayed)
  if (player.onElevated && !zombie.canClimb && player.elevatedTime < 5) return false;

  const zx = zombie.position.x;
  const zy = zombie.position.y;
  const px = player.position.x;
  const py = player.position.y;

  return (
    zx < px + player.size.width - 4 &&
    zx + zombie.size.width - 4 > px &&
    zy < py + player.size.height - 4 &&
    zy + zombie.size.height - 4 > py
  );
}

export function increaseZombieSpeed(zombie: Zombie, multiplier: number): Zombie {
  return {
    ...zombie,
    baseSpeed: zombie.baseSpeed * multiplier,
    speed: zombie.slowTimer > 0 ? zombie.speed : zombie.baseSpeed * multiplier,
  };
}
