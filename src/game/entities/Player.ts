import { Player, Position, TileType, GameMap } from '../types';

let playerIdCounter = 0;

const PLAYER_SIZE = 24;
const PLAYER_BASE_SPEED = 160; // pixels per second
const SPEED_BOOST_MULTIPLIER = 1.6;
const SPEED_BOOST_DURATION = 4; // seconds

export function createPlayer(spawnPos: Position, tileSize: number): Player {
  return {
    id: `player_${playerIdCounter++}`,
    position: {
      x: spawnPos.x * tileSize + tileSize / 2 - PLAYER_SIZE / 2,
      y: spawnPos.y * tileSize + tileSize / 2 - PLAYER_SIZE / 2,
    },
    size: { width: PLAYER_SIZE, height: PLAYER_SIZE },
    speed: PLAYER_BASE_SPEED,
    baseSpeed: PLAYER_BASE_SPEED,
    alive: true,
    onElevated: false,
    speedBoostTimer: 0,
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

  // Update speed boost timer
  if (updated.speedBoostTimer > 0) {
    updated.speedBoostTimer -= dt;
    updated.speed = updated.baseSpeed * SPEED_BOOST_MULTIPLIER;
    if (updated.speedBoostTimer <= 0) {
      updated.speedBoostTimer = 0;
      updated.speed = updated.baseSpeed;
    }
  }

  // Calculate movement
  const moveX = dx * updated.speed * dt;
  const moveY = dy * updated.speed * dt;

  // Try X movement
  const newX = updated.position.x + moveX;
  if (!collidesWithMap(newX, updated.position.y, updated.size.width, updated.size.height, map, true)) {
    updated.position.x = newX;
  }

  // Try Y movement
  const newY = updated.position.y + moveY;
  if (!collidesWithMap(updated.position.x, newY, updated.size.width, updated.size.height, map, true)) {
    updated.position.y = newY;
  }

  // Check if on elevated tile
  const centerX = updated.position.x + updated.size.width / 2;
  const centerY = updated.position.y + updated.size.height / 2;
  const tileCol = Math.floor(centerX / map.tileSize);
  const tileRow = Math.floor(centerY / map.tileSize);
  updated.onElevated = isInBounds(tileCol, tileRow, map) && map.tiles[tileRow][tileCol] === TileType.ELEVATED;

  return updated;
}

export function applySpeedBoost(player: Player): Player {
  return { ...player, speedBoostTimer: SPEED_BOOST_DURATION };
}

function isInBounds(col: number, row: number, map: GameMap): boolean {
  return col >= 0 && col < map.cols && row >= 0 && row < map.rows;
}

export function collidesWithMap(
  x: number, y: number, w: number, h: number,
  map: GameMap, isPlayer: boolean
): boolean {
  const { tileSize, tiles, cols, rows } = map;

  // Check all four corners and edges
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
    // Player can walk on elevated, zombies check handled separately
    if (!isPlayer && tile === TileType.ELEVATED) return false; // handled in zombie logic
  }

  return false;
}
