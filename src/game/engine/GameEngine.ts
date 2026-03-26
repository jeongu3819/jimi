import { GameState, GameSettings, ZombieTier } from '../types';
import { maps } from '../maps';
import { createPlayer, updatePlayer } from '../entities/Player';
import {
  createZombie, updateZombie, checkZombiePlayerCollision, increaseZombieSpeed,
} from '../entities/Zombie';

const PREP_TIME = 5;

export function createInitialState(settings: GameSettings): GameState {
  const map = maps[settings.mapId];
  if (!map) throw new Error(`Map not found: ${settings.mapId}`);

  const players = [];
  for (let i = 0; i < settings.playerCount; i++) {
    const pos = map.playerStartPositions[i % map.playerStartPositions.length];
    const name = settings.playerNames[i] || `P${i + 1}`;
    players.push(createPlayer(pos, map.tileSize, name, i));
  }

  return {
    phase: 'playing',
    players,
    zombies: [],
    map,
    settings,
    survivalTime: 0,
    prepTime: PREP_TIME,
    wave: 0,
    lightLevel: 1.0,
    lightRadius: 140,
    elapsedSinceLastSpawn: 0,
    winner: null,
    caughtPlayer: null,
  };
}

export interface PlayerInput {
  dx: number;
  dy: number;
}

export function updateGameState(
  state: GameState, inputs: PlayerInput[], dt: number
): GameState {
  if (state.phase !== 'playing') return state;
  const s = { ...state };
  s.survivalTime += dt;

  // Prep countdown
  if (s.prepTime > 0) {
    s.prepTime = Math.max(0, s.prepTime - dt);
  }
  const zombiesActive = s.prepTime <= 0;

  // Wave (every 15 seconds after prep)
  s.wave = zombiesActive ? Math.floor((s.survivalTime - PREP_TIME) / 15) + 1 : 0;

  // ── Light transition ──
  if (s.survivalTime < 8) {
    s.lightLevel = 1.0;
  } else if (s.survivalTime < 12) {
    const progress = (s.survivalTime - 8) / 4;
    s.lightLevel = 1.0 - progress;
    // Flicker effect
    if (Math.sin(s.survivalTime * 15) > 0.6) {
      s.lightLevel = Math.min(1, s.lightLevel + 0.35);
    }
  } else {
    s.lightLevel = 0;
  }

  // Light radius shrinks over time
  if (s.survivalTime > 12) {
    s.lightRadius = Math.max(70, 140 - (s.survivalTime - 12) * 0.35);
  }

  // ── Update players ──
  s.players = s.players.map((p, i) => {
    const input = inputs[i] || { dx: 0, dy: 0 };
    return updatePlayer(p, input.dx, input.dy, dt, s.map);
  });

  if (!zombiesActive) return s;

  // ── Update zombies ──
  s.zombies = s.zombies.map(z =>
    updateZombie(z, s.players, dt, s.map, s.zombies)
  );

  // ── Zombie-player collision (instant death) ──
  for (const z of s.zombies) {
    if (!z.alive) continue;
    for (let pi = 0; pi < s.players.length; pi++) {
      const p = s.players[pi];
      if (!p.alive) continue;
      if (checkZombiePlayerCollision(z, p)) {
        s.players[pi] = { ...p, alive: false, deathTime: s.survivalTime, damageFlash: 0.5 };

        if (s.settings.gameMode === 'first_caught') {
          s.phase = 'gameover';
          s.caughtPlayer = p.name;
          const alive = s.players.filter(pp => pp.alive);
          s.winner = alive.length > 0 ? alive.map(a => a.name).join(', ') : null;
          return s;
        }
      }
    }
  }

  // ── Check game over ──
  const alivePlayers = s.players.filter(p => p.alive);
  if (s.settings.playerCount > 1 && alivePlayers.length <= 1) {
    s.phase = 'gameover';
    s.winner = alivePlayers.length === 1 ? alivePlayers[0].name : null;
    const dead = s.players.filter(p => !p.alive).sort((a, b) => b.deathTime - a.deathTime);
    s.caughtPlayer = dead.length > 0 ? dead[dead.length - 1].name : null;
  } else if (s.settings.playerCount === 1 && alivePlayers.length === 0) {
    s.phase = 'gameover';
  }

  // ── Zombie merging (every 3 seconds, from wave 3) ──
  if (s.wave >= 3) {
    const tick = Math.floor(s.survivalTime / 3);
    const prevTick = Math.floor((s.survivalTime - dt) / 3);
    if (tick > prevTick) {
      s.zombies = processMerges(s.zombies);
    }
  }

  // ── Zombie spawning — swarm style ──
  s.elapsedSinceLastSpawn += dt;
  const diffMult = s.settings.difficulty === 'easy' ? 0.7
    : s.settings.difficulty === 'hard' ? 1.4 : 1.0;
  const spawnInterval = Math.max(0.4, 3.5 - s.wave * 0.35);
  const spawnCount = Math.min(10, Math.ceil((2 + s.wave * 1.2) * diffMult));

  if (s.elapsedSinceLastSpawn >= spawnInterval) {
    s.elapsedSinceLastSpawn = 0;
    for (let i = 0; i < spawnCount; i++) {
      const spawn = s.map.edgeSpawns[Math.floor(Math.random() * s.map.edgeSpawns.length)];
      let tier: ZombieTier = 0;
      if (s.wave >= 6 && Math.random() < 0.12) tier = 1;
      if (s.wave >= 10 && Math.random() < 0.06) tier = 2;
      s.zombies.push(createZombie(spawn, s.map.tileSize, s.settings.difficulty, tier));
    }
  }

  // ── Speed increase every 10 seconds ──
  const tick10 = Math.floor(s.survivalTime / 10);
  const prevTick10 = Math.floor((s.survivalTime - dt) / 10);
  if (tick10 > prevTick10) {
    s.zombies = s.zombies.map(z => increaseZombieSpeed(z, 1.03));
  }

  return s;
}

// ── Zombie merge system ──
function processMerges(zombies: GameState['zombies']): GameState['zombies'] {
  const zs = zombies.map(z => ({ ...z }));
  let merged = false;

  // Tier 0 × 3 → Tier 1
  if (!merged) {
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      if (!a.alive || a.tier !== 0 || a.isClimbing) continue;
      const acx = a.position.x + a.size.width / 2;
      const acy = a.position.y + a.size.height / 2;
      const nearby: number[] = [];
      for (let j = 0; j < zs.length; j++) {
        if (i === j) continue;
        const b = zs[j];
        if (!b.alive || b.tier !== 0 || b.isClimbing) continue;
        const dx = (b.position.x + b.size.width / 2) - acx;
        const dy = (b.position.y + b.size.height / 2) - acy;
        if (Math.sqrt(dx * dx + dy * dy) < 32) nearby.push(j);
      }
      if (nearby.length >= 2) {
        zs[nearby[0]].alive = false;
        zs[nearby[1]].alive = false;
        zs[i] = {
          ...a,
          tier: 1 as ZombieTier,
          size: { width: 30, height: 30 },
          speed: a.baseSpeed * 1.3,
          baseSpeed: a.baseSpeed * 1.3,
          mergeTimer: 0.4,
        };
        merged = true;
        break;
      }
    }
  }

  // Tier 1 × 2 → Tier 2
  if (!merged) {
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      if (!a.alive || a.tier !== 1 || a.isClimbing) continue;
      const acx = a.position.x + a.size.width / 2;
      const acy = a.position.y + a.size.height / 2;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j];
        if (!b.alive || b.tier !== 1 || b.isClimbing) continue;
        const dx = (b.position.x + b.size.width / 2) - acx;
        const dy = (b.position.y + b.size.height / 2) - acy;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          zs[j].alive = false;
          zs[i] = {
            ...a,
            tier: 2 as ZombieTier,
            size: { width: 44, height: 44 },
            speed: a.baseSpeed * 1.2,
            baseSpeed: a.baseSpeed * 1.2,
            mergeTimer: 0.6,
          };
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  return zs.filter(z => z.alive);
}
