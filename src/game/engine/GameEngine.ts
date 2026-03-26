import {
  GameState, GameSettings, ItemType, Bullet, Player, Zombie,
} from '../types';
import { maps } from '../maps';
import {
  createPlayer, updatePlayer, damagePlayer, healPlayer,
  upgradeGunDamage, upgradeGunRate, activateShield,
} from '../entities/Player';
import {
  createZombie, updateZombie, checkZombiePlayerCollision,
  getZombieAttackDamage, getZombiePlayerDamage, damageZombie, increaseZombieSpeed,
} from '../entities/Zombie';
import { createItemAtTile, createItem, updateItem, checkItemCollection } from '../entities/Item';

let bulletIdCounter = 0;
const BULLET_SPEED = 400;
const BULLET_LIFETIME = 0.6;
const ZOMBIE_SPAWN_BASE = 8;
const ITEM_SPAWN_INTERVAL = 8;
const WALL_REPAIR_RATE = 12;
const ZOMBIE_DROP_CHANCE = 0.22;
const PREP_TIME = 5; // seconds before zombies appear

export function createInitialState(settings: GameSettings): GameState {
  const map = maps[settings.mapId];
  if (!map) throw new Error(`Map not found: ${settings.mapId}`);

  // All players start at center positions
  const players: Player[] = [];
  for (let i = 0; i < settings.playerCount; i++) {
    const startPos = map.playerStartPositions[i % map.playerStartPositions.length];
    const name = settings.playerNames[i] || `P${i + 1}`;
    players.push(createPlayer(startPos, map.tileSize, name, i, -1)); // -1 = no base
  }

  // Create ALL base walls (all 6 bases exist, unclaimed)
  const baseWalls: GameState['baseWalls'] = [];
  let wallId = 0;
  for (let bi = 0; bi < map.baseConfigs.length; bi++) {
    const bc = map.baseConfigs[bi];
    for (const wt of bc.wallTiles) {
      baseWalls.push({
        id: `wall_${wallId++}`,
        tilePos: { ...wt },
        hp: 100, maxHp: 100,
        destroyed: false,
        isDoor: false,
        baseIndex: bi,
      });
    }
    baseWalls.push({
      id: `wall_${wallId++}`,
      tilePos: { ...bc.doorTile },
      hp: 120, maxHp: 120,
      destroyed: false,
      isDoor: true,
      baseIndex: bi,
    });
  }

  // All bases start unclaimed
  const baseOwners: (string | null)[] = map.baseConfigs.map(() => null);

  return {
    phase: 'playing',
    players,
    zombies: [],
    bullets: [],
    items: [],
    baseWalls,
    baseOwners,
    map,
    settings,
    survivalTime: 0,
    prepTime: PREP_TIME,
    wave: 0,
    zombiesKilled: 0,
    elapsedSinceLastSpawn: 0,
    elapsedSinceLastItem: 0,
    winner: null,
    caughtPlayer: null,
  };
}

export interface PlayerInput {
  dx: number;
  dy: number;
  shoot: boolean;
  shield: boolean;
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

  // Wave (only counts after prep)
  s.wave = zombiesActive ? Math.floor((s.survivalTime - PREP_TIME) / 20) + 1 : 0;

  // Update players
  s.players = s.players.map((p, i) => {
    const input = inputs[i] || { dx: 0, dy: 0, shoot: false, shield: false };
    let pl = updatePlayer(p, input.dx, input.dy, dt, s.map, s.baseWalls);
    if (input.shield) pl = activateShield(pl);
    return pl;
  });

  // Base claiming: player enters an unclaimed base interior
  for (let pi = 0; pi < s.players.length; pi++) {
    const p = s.players[pi];
    if (!p.alive || p.baseIndex !== -1) continue; // already has a base

    const pcx = p.position.x + p.size.width / 2;
    const pcy = p.position.y + p.size.height / 2;
    const ts = s.map.tileSize;

    for (let bi = 0; bi < s.map.baseConfigs.length; bi++) {
      if (s.baseOwners[bi] !== null) continue; // already claimed

      const bc = s.map.baseConfigs[bi];
      // Check if player is inside the base interior
      // Interior = center area (within walls)
      const bx = (bc.center.x - 1) * ts;
      const by = (bc.center.y) * ts;
      const bw = 3 * ts;
      const bh = 2 * ts;

      if (pcx >= bx && pcx <= bx + bw && pcy >= by && pcy <= by + bh) {
        // Claim this base!
        s.baseOwners[bi] = p.id;
        s.players[pi] = { ...p, baseIndex: bi };
        break;
      }
    }
  }

  // Auto-repair: player near own damaged wall
  s.baseWalls = s.baseWalls.map(bw => {
    if (bw.destroyed || bw.hp >= bw.maxHp) return bw;
    for (const p of s.players) {
      if (!p.alive || p.baseIndex !== bw.baseIndex || p.baseIndex === -1) continue;
      const px = p.position.x + p.size.width / 2;
      const py = p.position.y + p.size.height / 2;
      const wx = bw.tilePos.x * s.map.tileSize + s.map.tileSize / 2;
      const wy = bw.tilePos.y * s.map.tileSize + s.map.tileSize / 2;
      const dist = Math.sqrt((px - wx) ** 2 + (py - wy) ** 2);
      if (dist < s.map.tileSize * 2.5) {
        return { ...bw, hp: Math.min(bw.maxHp, bw.hp + WALL_REPAIR_RATE * dt) };
      }
    }
    return bw;
  });

  // Shooting (only after prep)
  const newBullets: Bullet[] = [];
  if (zombiesActive) {
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i];
      const input = inputs[i];
      if (!p.alive || !input?.shoot || p.shootCooldown > 0) continue;

      const pcx = p.position.x + p.size.width / 2;
      const pcy = p.position.y + p.size.height / 2;
      let target: Zombie | null = null;
      let tDist = p.gun.range;
      for (const z of s.zombies) {
        if (!z.alive) continue;
        const dx = (z.position.x + z.size.width / 2) - pcx;
        const dy = (z.position.y + z.size.height / 2) - pcy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < tDist) { tDist = d; target = z; }
      }

      if (target) {
        const tx = target.position.x + target.size.width / 2;
        const ty = target.position.y + target.size.height / 2;
        const angle = Math.atan2(ty - pcy, tx - pcx);
        s.players[i] = { ...p, shootCooldown: p.gun.fireRate, facingAngle: angle };

        for (let b = 0; b < p.gun.bulletCount; b++) {
          const spread = (b - (p.gun.bulletCount - 1) / 2) * 0.15;
          const a = angle + spread;
          newBullets.push({
            id: `bullet_${bulletIdCounter++}`,
            position: { x: pcx, y: pcy },
            velocity: { x: Math.cos(a) * BULLET_SPEED, y: Math.sin(a) * BULLET_SPEED },
            damage: p.gun.damage,
            lifetime: BULLET_LIFETIME,
            ownerId: p.id,
            piercing: false,
            hitIds: new Set(),
          });
        }
      }
    }
  }

  // Update bullets
  s.bullets = [...s.bullets, ...newBullets].map(b => ({
    ...b,
    position: { x: b.position.x + b.velocity.x * dt, y: b.position.y + b.velocity.y * dt },
    lifetime: b.lifetime - dt,
  })).filter(b => b.lifetime > 0);

  // Bullet-zombie collisions
  for (const bullet of s.bullets) {
    for (let zi = 0; zi < s.zombies.length; zi++) {
      const z = s.zombies[zi];
      if (!z.alive || bullet.hitIds.has(z.id)) continue;
      const dx = bullet.position.x - (z.position.x + z.size.width / 2);
      const dy = bullet.position.y - (z.position.y + z.size.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 14) {
        s.zombies[zi] = damageZombie(z, bullet.damage);
        bullet.hitIds.add(z.id);
        if (!s.zombies[zi].alive) {
          s.zombiesKilled++;
          if (Math.random() < ZOMBIE_DROP_CHANCE) {
            s.items.push(createItem({ x: z.position.x, y: z.position.y }));
          }
        }
        if (!bullet.piercing) bullet.lifetime = 0;
        break;
      }
    }
  }

  // Bullet-wall collisions
  for (const bullet of s.bullets) {
    if (bullet.lifetime <= 0) continue;
    const col = Math.floor(bullet.position.x / s.map.tileSize);
    const row = Math.floor(bullet.position.y / s.map.tileSize);
    if (col >= 0 && col < s.map.cols && row >= 0 && row < s.map.rows) {
      if (s.map.tiles[row][col] === 1) bullet.lifetime = 0;
    }
  }
  s.bullets = s.bullets.filter(b => b.lifetime > 0);

  // Update zombies (only if active)
  if (zombiesActive) {
    s.zombies = s.zombies.map(z => updateZombie(z, s.players, dt, s.map, s.baseWalls, s.zombies));

    // Zombie wall attacks
    for (const z of s.zombies) {
      if (!z.alive || !z.targetWallId || z.attackCooldown > 0) continue;
      const wallIdx = s.baseWalls.findIndex(w => w.id === z.targetWallId);
      if (wallIdx === -1) continue;
      const wall = s.baseWalls[wallIdx];
      if (wall.destroyed) continue;
      const newHp = Math.max(0, wall.hp - getZombieAttackDamage(z) * dt);
      s.baseWalls[wallIdx] = { ...wall, hp: newHp, destroyed: newHp <= 0 };
    }

    // Zombie-player collision damage
    for (const z of s.zombies) {
      if (!z.alive) continue;
      for (let pi = 0; pi < s.players.length; pi++) {
        const p = s.players[pi];
        if (!p.alive) continue;
        if (checkZombiePlayerCollision(z, p)) {
          s.players[pi] = damagePlayer(p, getZombiePlayerDamage(z) * dt);
          if (!s.players[pi].alive) {
            s.players[pi] = { ...s.players[pi], deathTime: s.survivalTime };
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
    }
  }

  // Check last survivor
  const alivePlayers = s.players.filter(p => p.alive);
  if (s.settings.playerCount > 1 && alivePlayers.length <= 1) {
    s.phase = 'gameover';
    s.winner = alivePlayers.length === 1 ? alivePlayers[0].name : null;
    const dead = s.players.filter(p => !p.alive).sort((a, b) => b.deathTime - a.deathTime);
    s.caughtPlayer = dead.length > 0 ? dead[dead.length - 1].name : null;
  } else if (s.settings.playerCount === 1 && alivePlayers.length === 0) {
    s.phase = 'gameover';
  }

  // Items
  s.items = s.items.map(it => updateItem(it, dt)).filter(it => !it.collected || it.lifetime > 0);
  for (let ii = 0; ii < s.items.length; ii++) {
    const item = s.items[ii];
    if (item.collected) continue;
    for (let pi = 0; pi < s.players.length; pi++) {
      const p = s.players[pi];
      if (!p.alive) continue;
      if (checkItemCollection(item, p)) {
        s.items[ii] = { ...item, collected: true };
        switch (item.type) {
          case ItemType.GUN_DAMAGE: s.players[pi] = upgradeGunDamage(p); break;
          case ItemType.GUN_RATE: s.players[pi] = upgradeGunRate(p); break;
          case ItemType.WALL_REPAIR:
            if (p.baseIndex >= 0) {
              s.baseWalls = s.baseWalls.map(w =>
                w.baseIndex === p.baseIndex && !w.destroyed
                  ? { ...w, hp: Math.min(w.maxHp, w.hp + 50) }
                  : w
              );
            }
            break;
          case ItemType.HEALTH_PACK: s.players[pi] = healPlayer(p, 35); break;
        }
        break;
      }
    }
  }

  // Zombie spawning (only after prep)
  if (zombiesActive) {
    s.elapsedSinceLastSpawn += dt;
    const spawnInterval = Math.max(2, ZOMBIE_SPAWN_BASE - s.wave * 0.8);
    const spawnCount = Math.min(4, 1 + Math.floor(s.wave / 2));
    if (s.elapsedSinceLastSpawn >= spawnInterval) {
      s.elapsedSinceLastSpawn = 0;
      for (let i = 0; i < spawnCount; i++) {
        let spawn;
        if (s.wave <= 2) {
          const cx = s.map.centerSpawn.x + Math.floor(Math.random() * 5 - 2);
          const cy = s.map.centerSpawn.y + Math.floor(Math.random() * 3 - 1);
          spawn = { x: cx, y: cy };
        } else {
          if (Math.random() < 0.4) {
            const cx = s.map.centerSpawn.x + Math.floor(Math.random() * 5 - 2);
            const cy = s.map.centerSpawn.y + Math.floor(Math.random() * 3 - 1);
            spawn = { x: cx, y: cy };
          } else {
            spawn = s.map.edgeSpawns[Math.floor(Math.random() * s.map.edgeSpawns.length)];
          }
        }
        s.zombies.push(createZombie(spawn, s.map.tileSize, s.settings.difficulty));
      }
    }
  }

  // Item spawning (only after prep)
  if (zombiesActive) {
    s.elapsedSinceLastItem += dt;
    if (s.elapsedSinceLastItem >= ITEM_SPAWN_INTERVAL) {
      s.elapsedSinceLastItem = 0;
      const area = s.map.itemSpawnArea;
      const tx = Math.floor(Math.random() * (area.maxX - area.minX)) + area.minX;
      const ty = Math.floor(Math.random() * (area.maxY - area.minY)) + area.minY;
      if (s.map.tiles[ty]?.[tx] === 0) {
        s.items.push(createItemAtTile(tx, ty, s.map.tileSize));
      }
    }
  }

  // Speed increase
  if (zombiesActive) {
    const tick10s = Math.floor(s.survivalTime / 10);
    const prevTick = Math.floor((s.survivalTime - dt) / 10);
    if (tick10s > prevTick) {
      s.zombies = s.zombies.map(z => increaseZombieSpeed(z, 1.03));
    }
  }

  return s;
}
