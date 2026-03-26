import { Player, Position, TileType, GameMap } from '../types';

const PLAYER_SIZE = 24;
const PLAYER_BASE_SPEED = 160;
const SPEED_BOOST_MULTIPLIER = 1.6;
const SPEED_BOOST_DURATION = 4;
const SHIELD_DURATION = 2.5;
const ELEVATED_SPEED_PENALTY_START = 3; // seconds before speed penalty kicks in
const ELEVATED_SPEED_PENALTY = 0.6;     // 60% speed when overstaying
const STUN_SLOW_FACTOR = 0.3;

const PLAYER_COLORS = ['#4a9eff', '#44dd55', '#ff77aa', '#ffaa33'];

export function createPlayer(
  spawnPos: Position,
  tileSize: number,
  name: string,
  index: number
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
    onElevated: false,
    elevatedTime: 0,
    speedBoostTimer: 0,
    shieldAvailable: true,
    shieldActive: false,
    shieldTimer: 0,
    stunTimer: 0,
    slowTimer: 0,
    facingX: 0,
    facingY: 1,
    walkCycle: 0,
    deathTime: 0,
    playerIndex: index,
  };
}

export function updatePlayer(
  player: Player,
  dx: number,
  dy: number,
  dt: number,
  map: GameMap
): Player {
  if (!player.alive) return player;

  const updated = { ...player };

  // Update timers
  if (updated.stunTimer > 0) {
    updated.stunTimer -= dt;
    if (updated.stunTimer <= 0) updated.stunTimer = 0;
  }

  if (updated.slowTimer > 0) {
    updated.slowTimer -= dt;
    if (updated.slowTimer <= 0) updated.slowTimer = 0;
  }

  if (updated.shieldTimer > 0) {
    updated.shieldTimer -= dt;
    if (updated.shieldTimer <= 0) {
      updated.shieldTimer = 0;
      updated.shieldActive = false;
    }
  }

  if (updated.speedBoostTimer > 0) {
    updated.speedBoostTimer -= dt;
    if (updated.speedBoostTimer <= 0) updated.speedBoostTimer = 0;
  }

  // Stunned = can't move
  if (updated.stunTimer > 0) {
    updated.walkCycle += dt * 8;
    return updated;
  }

  // Calculate effective speed
  let effectiveSpeed = updated.baseSpeed;
  if (updated.speedBoostTimer > 0) effectiveSpeed *= SPEED_BOOST_MULTIPLIER;
  if (updated.slowTimer > 0) effectiveSpeed *= STUN_SLOW_FACTOR;
  if (updated.onElevated && updated.elevatedTime > ELEVATED_SPEED_PENALTY_START) {
    effectiveSpeed *= ELEVATED_SPEED_PENALTY;
  }
  updated.speed = effectiveSpeed;

  // Update facing direction
  if (dx !== 0 || dy !== 0) {
    updated.facingX = dx;
    updated.facingY = dy;
    updated.walkCycle += dt * 10;
  }

  const moveX = dx * updated.speed * dt;
  const moveY = dy * updated.speed * dt;

  const newX = updated.position.x + moveX;
  if (!collidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map)) {
    updated.position.x = newX;
  }

  const newY = updated.position.y + moveY;
  if (!collidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map)) {
    updated.position.y = newY;
  }

  // Check elevated
  const centerX = updated.position.x + updated.size.width / 2;
  const centerY = updated.position.y + updated.size.height / 2;
  const tileCol = Math.floor(centerX / map.tileSize);
  const tileRow = Math.floor(centerY / map.tileSize);
  const wasElevated = updated.onElevated;
  updated.onElevated = isInBounds(tileCol, tileRow, map) && map.tiles[tileRow][tileCol] === TileType.ELEVATED;

  if (updated.onElevated) {
    updated.elevatedTime += dt;
  } else {
    updated.elevatedTime = 0;
  }

  return updated;
}

export function activateShield(player: Player): Player {
  if (!player.shieldAvailable || player.shieldActive || !player.alive) return player;
  return {
    ...player,
    shieldAvailable: false,
    shieldActive: true,
    shieldTimer: SHIELD_DURATION,
    stunTimer: 0,
    slowTimer: 0,
  };
}

export function applySpeedBoost(player: Player): Player {
  return { ...player, speedBoostTimer: SPEED_BOOST_DURATION };
}

export function applyWebHit(player: Player): Player {
  if (player.shieldActive) return player;
  return { ...player, slowTimer: 2.0, stunTimer: 0.5 };
}

function isInBounds(col: number, row: number, map: GameMap): boolean {
  return col >= 0 && col < map.cols && row >= 0 && row < map.rows;
}

export function collidesWithMap(
  x: number, y: number, w: number, h: number,
  map: GameMap
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
  }

  return false;
}
