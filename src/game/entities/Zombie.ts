import { Zombie, Position, Difficulty, GameMap, TileType, Player } from '../types';

let zombieIdCounter = 0;

const ZOMBIE_SIZE = 22;

const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 60,
  normal: 90,
  hard: 120,
};

export function createZombie(
  spawnPos: Position,
  tileSize: number,
  difficulty: Difficulty
): Zombie {
  const baseSpeed = SPEED_BY_DIFFICULTY[difficulty];
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
  };
}

export function updateZombie(
  zombie: Zombie,
  player: Player,
  dt: number,
  map: GameMap,
  allZombies: Zombie[]
): Zombie {
  if (!zombie.alive || !player.alive) return zombie;

  const updated = { ...zombie };

  // Update slow timer
  if (updated.slowTimer > 0) {
    updated.slowTimer -= dt;
    updated.speed = updated.baseSpeed * 0.4;
    if (updated.slowTimer <= 0) {
      updated.slowTimer = 0;
      updated.speed = updated.baseSpeed;
    }
  }

  const playerCX = player.position.x + player.size.width / 2;
  const playerCY = player.position.y + player.size.height / 2;
  const zombieCX = updated.position.x + updated.size.width / 2;
  const zombieCY = updated.position.y + updated.size.height / 2;

  // If player is on elevated and zombie can't climb, wander
  if (player.onElevated && !updated.canClimb) {
    return wanderZombie(updated, dt, map);
  }

  let dx = playerCX - zombieCX;
  let dy = playerCY - zombieCY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return updated;

  dx /= dist;
  dy /= dist;

  // Normal/Hard: add slight prediction
  if (updated.type !== 'easy') {
    const prediction = updated.type === 'hard' ? 0.4 : 0.2;
    dx += (Math.random() - 0.5) * prediction;
    dy += (Math.random() - 0.5) * prediction;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  const moveX = dx * updated.speed * dt;
  const moveY = dy * updated.speed * dt;

  // Try X
  const newX = updated.position.x + moveX;
  if (!zombieCollidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.x = newX;
  } else if (updated.type !== 'easy') {
    // Try sliding along wall
    const slideY = (dy > 0 ? 1 : -1) * updated.speed * dt * 0.5;
    const newYSlide = updated.position.y + slideY;
    if (!zombieCollidesWithMap(updated.position.x, newYSlide, updated.size.width, updated.size.height, map, updated.canClimb)) {
      updated.position.y = newYSlide;
    }
  }

  // Try Y
  const newY = updated.position.y + moveY;
  if (!zombieCollidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.y = newY;
  } else if (updated.type !== 'easy') {
    const slideX = (dx > 0 ? 1 : -1) * updated.speed * dt * 0.5;
    const newXSlide = updated.position.x + slideX;
    if (!zombieCollidesWithMap(newXSlide, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
      updated.position.x = newXSlide;
    }
  }

  // Simple separation from other zombies
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

  return updated;
}

function wanderZombie(zombie: Zombie, dt: number, map: GameMap): Zombie {
  const updated = { ...zombie };
  const angle = Math.sin(Date.now() * 0.001 + parseInt(zombie.id.split('_')[1]) * 2.3) * Math.PI;
  const moveX = Math.cos(angle) * updated.speed * 0.3 * dt;
  const moveY = Math.sin(angle) * updated.speed * 0.3 * dt;

  const newX = updated.position.x + moveX;
  if (!zombieCollidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.x = newX;
  }
  const newY = updated.position.y + moveY;
  if (!zombieCollidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map, updated.canClimb)) {
    updated.position.y = newY;
  }
  return updated;
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
