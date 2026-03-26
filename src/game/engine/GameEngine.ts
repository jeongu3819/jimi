import {
  GameState, GameSettings, Difficulty, ItemType, GameMap,
} from '../types';
import { maps } from '../maps';
import { createPlayer, updatePlayer, applySpeedBoost } from '../entities/Player';
import {
  createZombie, updateZombie, checkZombiePlayerCollision,
  applySlowToZombie, increaseZombieSpeed,
} from '../entities/Zombie';
import { createItem, updateItem, checkItemCollection, collectItem } from '../entities/Item';

const ZOMBIE_SPAWN_INTERVAL = 15; // seconds between extra zombie spawns
const SPEED_INCREASE_INTERVAL = 10; // seconds between speed increases
const MIN_SPAWN_DISTANCE = 6; // minimum tile distance from player for zombie spawn

export function createInitialState(settings: GameSettings): GameState {
  const map = maps[settings.mapId];
  if (!map) throw new Error(`Map not found: ${settings.mapId}`);

  const player = createPlayer(map.playerSpawn, map.tileSize);

  // Select spawn points far from player
  const sortedSpawns = [...map.zombieSpawns].sort((a, b) => {
    const distA = Math.abs(a.x - map.playerSpawn.x) + Math.abs(a.y - map.playerSpawn.y);
    const distB = Math.abs(b.x - map.playerSpawn.x) + Math.abs(b.y - map.playerSpawn.y);
    return distB - distA;
  });

  const zombies = [];
  for (let i = 0; i < settings.zombieCount; i++) {
    const spawnIdx = i % sortedSpawns.length;
    zombies.push(createZombie(sortedSpawns[spawnIdx], map.tileSize, settings.difficulty));
  }

  // Create items
  const itemTypes = [ItemType.SPEED_BOOST, ItemType.ZOMBIE_SLOW];
  const items = map.itemSpawns.map((spawn, i) =>
    createItem(spawn, map.tileSize, itemTypes[i % itemTypes.length])
  );

  return {
    phase: 'playing',
    player,
    zombies,
    items,
    map,
    settings,
    survivalTime: 0,
    score: 0,
    elapsedSinceLastSpawn: 0,
  };
}

export function updateGameState(
  state: GameState,
  input: { dx: number; dy: number },
  dt: number
): GameState {
  if (state.phase !== 'playing') return state;

  const updated = { ...state };
  updated.survivalTime += dt;

  // Update player
  updated.player = updatePlayer(updated.player, input.dx, input.dy, dt, updated.map);

  // Update zombies
  updated.zombies = updated.zombies.map(z =>
    updateZombie(z, updated.player, dt, updated.map, updated.zombies)
  );

  // Check zombie-player collisions
  for (const zombie of updated.zombies) {
    if (checkZombiePlayerCollision(zombie, updated.player)) {
      // Player on elevated and zombie can't climb = safe
      if (updated.player.onElevated && !zombie.canClimb) continue;
      updated.player = { ...updated.player, alive: false };
      updated.phase = 'gameover';
      break;
    }
  }

  // Update items
  updated.items = updated.items.map(item => {
    const updatedItem = updateItem(item, dt);
    if (checkItemCollection(updatedItem, updated.player)) {
      const collected = collectItem(updatedItem);
      // Apply item effect
      if (collected.type === ItemType.SPEED_BOOST) {
        updated.player = applySpeedBoost(updated.player);
      } else if (collected.type === ItemType.ZOMBIE_SLOW) {
        updated.zombies = updated.zombies.map(z => applySlowToZombie(z));
      }
      return collected;
    }
    return updatedItem;
  });

  // Progressive difficulty: spawn extra zombie
  updated.elapsedSinceLastSpawn += dt;
  if (updated.elapsedSinceLastSpawn >= ZOMBIE_SPAWN_INTERVAL) {
    updated.elapsedSinceLastSpawn = 0;
    const spawn = getDistantSpawn(updated.player, updated.map);
    if (spawn) {
      updated.zombies = [
        ...updated.zombies,
        createZombie(spawn, updated.map.tileSize, updated.settings.difficulty),
      ];
    }
  }

  // Progressive difficulty: increase zombie speed
  const speedTicks = Math.floor(updated.survivalTime / SPEED_INCREASE_INTERVAL);
  const prevTicks = Math.floor((updated.survivalTime - dt) / SPEED_INCREASE_INTERVAL);
  if (speedTicks > prevTicks) {
    updated.zombies = updated.zombies.map(z => increaseZombieSpeed(z, 1.03));
  }

  // Score
  const difficultyMultiplier = updated.settings.difficulty === 'hard' ? 3 :
    updated.settings.difficulty === 'normal' ? 2 : 1;
  updated.score = Math.floor(updated.survivalTime * 10 * difficultyMultiplier);

  return updated;
}

function getDistantSpawn(player: { position: { x: number; y: number } }, map: GameMap) {
  const playerTileX = Math.floor(player.position.x / map.tileSize);
  const playerTileY = Math.floor(player.position.y / map.tileSize);

  const validSpawns = map.zombieSpawns.filter(s => {
    const dist = Math.abs(s.x - playerTileX) + Math.abs(s.y - playerTileY);
    return dist >= MIN_SPAWN_DISTANCE;
  });

  if (validSpawns.length === 0) return map.zombieSpawns[0];
  return validSpawns[Math.floor(Math.random() * validSpawns.length)];
}
