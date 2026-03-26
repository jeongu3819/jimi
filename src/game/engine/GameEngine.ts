import {
  GameState, GameSettings, ItemType, Projectile, Player,
} from '../types';
import { maps } from '../maps';
import { createPlayer, updatePlayer, applySpeedBoost, applyWebHit, activateShield } from '../entities/Player';
import {
  createZombie, updateZombie, checkZombiePlayerCollision,
  applySlowToZombie, increaseZombieSpeed,
} from '../entities/Zombie';
import { createItem, updateItem, checkItemCollection, collectItem } from '../entities/Item';

const ZOMBIE_SPAWN_INTERVAL = 12;
const SPEED_INCREASE_INTERVAL = 8;
const MIN_SPAWN_DISTANCE = 6;

export function createInitialState(settings: GameSettings): GameState {
  const map = maps[settings.mapId];
  if (!map) throw new Error(`Map not found: ${settings.mapId}`);

  // Create players
  const players: Player[] = [];
  for (let i = 0; i < settings.playerCount; i++) {
    const spawnPos = map.playerSpawns[i % map.playerSpawns.length];
    const name = settings.playerNames[i] || `P${i + 1}`;
    players.push(createPlayer(spawnPos, map.tileSize, name, i));
  }

  // Create zombies far from all players
  const sortedSpawns = [...map.zombieSpawns].sort((a, b) => {
    const distA = players.reduce((min, p) => {
      const sx = map.playerSpawns[p.playerIndex % map.playerSpawns.length];
      return Math.min(min, Math.abs(a.x - sx.x) + Math.abs(a.y - sx.y));
    }, Infinity);
    const distB = players.reduce((min, p) => {
      const sx = map.playerSpawns[p.playerIndex % map.playerSpawns.length];
      return Math.min(min, Math.abs(b.x - sx.x) + Math.abs(b.y - sx.y));
    }, Infinity);
    return distB - distA;
  });

  const zombies = [];
  for (let i = 0; i < settings.zombieCount; i++) {
    const spawnIdx = i % sortedSpawns.length;
    zombies.push(createZombie(sortedSpawns[spawnIdx], map.tileSize, settings.difficulty));
  }

  const itemTypes = [ItemType.SPEED_BOOST, ItemType.ZOMBIE_SLOW];
  const items = map.itemSpawns.map((spawn, i) =>
    createItem(spawn, map.tileSize, itemTypes[i % itemTypes.length])
  );

  return {
    phase: 'playing',
    players,
    zombies,
    projectiles: [],
    items,
    map,
    settings,
    survivalTime: 0,
    score: 0,
    elapsedSinceLastSpawn: 0,
    winner: null,
    caughtPlayer: null,
  };
}

export interface PlayerInput {
  dx: number;
  dy: number;
  shield: boolean;
}

export function updateGameState(
  state: GameState,
  inputs: PlayerInput[],
  dt: number
): GameState {
  if (state.phase !== 'playing') return state;

  const updated = { ...state };
  updated.survivalTime += dt;

  // Update players
  updated.players = updated.players.map((p, i) => {
    const input = inputs[i] || { dx: 0, dy: 0, shield: false };
    let pl = updatePlayer(p, input.dx, input.dy, dt, updated.map);
    if (input.shield) {
      pl = activateShield(pl);
    }
    return pl;
  });

  // Update zombies
  const newProjectiles: Projectile[] = [];
  updated.zombies = updated.zombies.map(z => {
    const result = updateZombie(z, updated.players, dt, updated.map, updated.zombies);
    if (result.newProjectile) newProjectiles.push(result.newProjectile);
    return result.zombie;
  });

  // Update projectiles
  updated.projectiles = [...updated.projectiles, ...newProjectiles]
    .map(p => ({
      ...p,
      position: {
        x: p.position.x + p.velocity.x * dt,
        y: p.position.y + p.velocity.y * dt,
      },
      lifetime: p.lifetime - dt,
    }))
    .filter(p => p.lifetime > 0);

  // Check projectile-player collisions
  for (const proj of updated.projectiles) {
    for (let i = 0; i < updated.players.length; i++) {
      const p = updated.players[i];
      if (!p.alive) continue;
      const px = p.position.x + p.size.width / 2;
      const py = p.position.y + p.size.height / 2;
      const dx = proj.position.x - px;
      const dy = proj.position.y - py;
      if (Math.sqrt(dx * dx + dy * dy) < 16) {
        updated.players[i] = applyWebHit(p);
        proj.lifetime = 0; // consumed
      }
    }
  }
  updated.projectiles = updated.projectiles.filter(p => p.lifetime > 0);

  // Check zombie-player collisions
  for (const zombie of updated.zombies) {
    for (let i = 0; i < updated.players.length; i++) {
      const p = updated.players[i];
      if (!p.alive) continue;
      if (checkZombiePlayerCollision(zombie, p)) {
        updated.players[i] = { ...p, alive: false, deathTime: updated.survivalTime };

        // First Caught mode: game over immediately
        if (updated.settings.gameMode === 'first_caught') {
          updated.phase = 'gameover';
          updated.caughtPlayer = p.name;
          const survivors = updated.players.filter(pp => pp.alive);
          if (survivors.length > 0) {
            updated.winner = survivors.length === 1
              ? survivors[0].name
              : survivors.map(s => s.name).join(', ');
          }
          return updated;
        }
      }
    }
  }

  // Last Survivor: check if only one or zero alive
  const alivePlayers = updated.players.filter(p => p.alive);
  if (updated.settings.playerCount > 1) {
    if (alivePlayers.length <= 1) {
      updated.phase = 'gameover';
      updated.winner = alivePlayers.length === 1 ? alivePlayers[0].name : null;
      const dead = updated.players.filter(p => !p.alive).sort((a, b) => b.deathTime - a.deathTime);
      updated.caughtPlayer = dead.length > 0 ? dead[dead.length - 1].name : null;
    }
  } else {
    // Single player: game over when dead
    if (alivePlayers.length === 0) {
      updated.phase = 'gameover';
    }
  }

  // Items - each alive player can collect
  updated.items = updated.items.map(item => {
    let updatedItem = updateItem(item, dt);
    for (let i = 0; i < updated.players.length; i++) {
      const p = updated.players[i];
      if (!p.alive) continue;
      if (checkItemCollection(updatedItem, p)) {
        updatedItem = collectItem(updatedItem);
        if (updatedItem.type === ItemType.SPEED_BOOST) {
          updated.players[i] = applySpeedBoost(p);
        } else if (updatedItem.type === ItemType.ZOMBIE_SLOW) {
          updated.zombies = updated.zombies.map(z => applySlowToZombie(z));
        }
        break;
      }
    }
    return updatedItem;
  });

  // Progressive difficulty
  updated.elapsedSinceLastSpawn += dt;
  if (updated.elapsedSinceLastSpawn >= ZOMBIE_SPAWN_INTERVAL) {
    updated.elapsedSinceLastSpawn = 0;
    const firstAlive = alivePlayers[0];
    if (firstAlive) {
      const spawn = getDistantSpawn(firstAlive, updated.map);
      if (spawn) {
        updated.zombies = [
          ...updated.zombies,
          createZombie(spawn, updated.map.tileSize, updated.settings.difficulty),
        ];
      }
    }
  }

  const speedTicks = Math.floor(updated.survivalTime / SPEED_INCREASE_INTERVAL);
  const prevTicks = Math.floor((updated.survivalTime - dt) / SPEED_INCREASE_INTERVAL);
  if (speedTicks > prevTicks) {
    updated.zombies = updated.zombies.map(z => increaseZombieSpeed(z, 1.04));
  }

  const diffMul = updated.settings.difficulty === 'hard' ? 3 :
    updated.settings.difficulty === 'normal' ? 2 : 1;
  updated.score = Math.floor(updated.survivalTime * 10 * diffMul);

  return updated;
}

function getDistantSpawn(player: Player, map: { zombieSpawns: { x: number; y: number }[]; tileSize: number }) {
  const ptx = Math.floor(player.position.x / map.tileSize);
  const pty = Math.floor(player.position.y / map.tileSize);
  const valid = map.zombieSpawns.filter(s =>
    Math.abs(s.x - ptx) + Math.abs(s.y - pty) >= MIN_SPAWN_DISTANCE
  );
  if (valid.length === 0) return map.zombieSpawns[0];
  return valid[Math.floor(Math.random() * valid.length)];
}
