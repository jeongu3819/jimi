import { Player, Position, TileType, GameMap, BaseWall, GunStats } from '../types';

const PLAYER_SIZE = 22;
const PLAYER_BASE_SPEED = 140;
const SHIELD_DURATION = 2.5;
const PLAYER_COLORS = ['#4a9eff', '#44dd55', '#ff77aa', '#ffaa33', '#cc88ff'];

const DEFAULT_GUN: GunStats = {
  damage: 15,
  fireRate: 0.4,
  bulletCount: 1,
  range: 220,
};

export function createPlayer(
  spawnPos: Position, tileSize: number, name: string, index: number, baseIndex: number = -1
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
    hp: 100,
    maxHp: 100,
    baseIndex, // -1 = no base yet
    gun: { ...DEFAULT_GUN },
    shootCooldown: 0,
    facingAngle: 0,
    facingX: 0,
    facingY: 1,
    walkCycle: 0,
    deathTime: 0,
    playerIndex: index,
    shieldAvailable: true,
    shieldActive: false,
    shieldTimer: 0,
    speedBoostTimer: 0,
    damageFlash: 0,
  };
}

export function updatePlayer(
  player: Player, dx: number, dy: number, dt: number,
  map: GameMap, baseWalls: BaseWall[]
): Player {
  if (!player.alive) return player;
  const p = { ...player };

  // Timers
  if (p.shieldTimer > 0) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) { p.shieldTimer = 0; p.shieldActive = false; }
  }
  if (p.speedBoostTimer > 0) {
    p.speedBoostTimer -= dt;
    if (p.speedBoostTimer <= 0) p.speedBoostTimer = 0;
  }
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.damageFlash > 0) p.damageFlash -= dt;

  const effectiveSpeed = p.baseSpeed * (p.speedBoostTimer > 0 ? 1.5 : 1);
  p.speed = effectiveSpeed;

  if (dx !== 0 || dy !== 0) {
    p.facingX = dx;
    p.facingY = dy;
    p.facingAngle = Math.atan2(dy, dx);
    p.walkCycle += dt * 10;
  }

  const moveX = dx * effectiveSpeed * dt;
  const moveY = dy * effectiveSpeed * dt;

  const nx = p.position.x + moveX;
  if (!collidesAny(nx, p.position.y, p.size.width, p.size.height, map, baseWalls, p.baseIndex)) {
    p.position.x = nx;
  }
  const ny = p.position.y + moveY;
  if (!collidesAny(p.position.x, ny, p.size.width, p.size.height, map, baseWalls, p.baseIndex)) {
    p.position.y = ny;
  }

  return p;
}

export function activateShield(player: Player): Player {
  if (!player.shieldAvailable || player.shieldActive || !player.alive) return player;
  return { ...player, shieldAvailable: false, shieldActive: true, shieldTimer: SHIELD_DURATION };
}

export function damagePlayer(player: Player, amount: number): Player {
  if (player.shieldActive || !player.alive) return player;
  const hp = Math.max(0, player.hp - amount);
  return { ...player, hp, alive: hp > 0, damageFlash: 0.3 };
}

export function healPlayer(player: Player, amount: number): Player {
  return { ...player, hp: Math.min(player.maxHp, player.hp + amount) };
}

export function upgradeGunDamage(player: Player): Player {
  return { ...player, gun: { ...player.gun, damage: player.gun.damage + 5 } };
}

export function upgradeGunRate(player: Player): Player {
  return {
    ...player,
    gun: { ...player.gun, fireRate: Math.max(0.12, player.gun.fireRate - 0.06) },
  };
}

function collidesAny(
  x: number, y: number, w: number, h: number,
  map: GameMap, baseWalls: BaseWall[], playerBaseIndex: number
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

    // Check base walls - players can pass through their own door, or any door if no base yet
    for (const bw of baseWalls) {
      if (bw.destroyed) continue;
      if (bw.tilePos.x === col && bw.tilePos.y === row) {
        if (bw.isDoor && (playerBaseIndex === -1 || bw.baseIndex === playerBaseIndex)) continue;
        return true;
      }
    }
  }
  return false;
}
