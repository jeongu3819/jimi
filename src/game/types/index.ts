export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'last_survivor' | 'first_caught';
export type VisionMode = 'normal' | 'blackout';

export interface Position { x: number; y: number; }
export interface Size { width: number; height: number; }

export enum TileType {
  FLOOR = 0,
  WALL = 1,
}

export interface GameMap {
  id: string;
  name: string;
  nameKo: string;
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[][];
  baseConfigs: BaseConfig[];
  playerStartPositions: Position[];  // all players start near center
  centerSpawn: Position;
  edgeSpawns: Position[];
  itemSpawnArea: { minX: number; maxX: number; minY: number; maxY: number };
  description: string;
}

export interface BaseConfig {
  wallTiles: Position[];
  doorTile: Position;
  doorDir: 'up' | 'down' | 'left' | 'right';
  spawnPos: Position;
  center: Position;
}

export interface BaseWall {
  id: string;
  tilePos: Position;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  isDoor: boolean;
  baseIndex: number;
}

export interface GunStats {
  damage: number;
  fireRate: number;
  bulletCount: number;
  range: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: Position;
  size: Size;
  speed: number;
  baseSpeed: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  baseIndex: number;
  gun: GunStats;
  shootCooldown: number;
  facingAngle: number;
  facingX: number;
  facingY: number;
  walkCycle: number;
  deathTime: number;
  playerIndex: number;
  shieldAvailable: boolean;
  shieldActive: boolean;
  shieldTimer: number;
  speedBoostTimer: number;
  damageFlash: number;
}

export interface Zombie {
  id: string;
  position: Position;
  size: Size;
  speed: number;
  baseSpeed: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  type: Difficulty;
  targetWallId: string | null;
  attackCooldown: number;
  walkCycle: number;
  facingX: number;
  facingY: number;
  prevPosition: Position;
  stuckTime: number;
  escapeAngle: number;
  escapeTimer: number;
}

export interface Bullet {
  id: string;
  position: Position;
  velocity: Position;
  damage: number;
  lifetime: number;
  ownerId: string;
  piercing: boolean;
  hitIds: Set<string>;
}

export enum ItemType {
  GUN_DAMAGE = 'gun_damage',
  GUN_RATE = 'gun_rate',
  WALL_REPAIR = 'wall_repair',
  HEALTH_PACK = 'health_pack',
}

export interface Item {
  id: string;
  position: Position;
  type: ItemType;
  collected: boolean;
  lifetime: number;
}

export interface GameSettings {
  mapId: string;
  zombieCount: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  visionMode: VisionMode;
  playerCount: number;
  playerNames: string[];
}

export interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'gameover';
  players: Player[];
  zombies: Zombie[];
  bullets: Bullet[];
  items: Item[];
  baseWalls: BaseWall[];
  baseOwners: (string | null)[];  // baseIndex -> player id (null = unclaimed)
  map: GameMap;
  settings: GameSettings;
  survivalTime: number;
  prepTime: number;               // countdown before zombies (starts at 5)
  wave: number;
  zombiesKilled: number;
  elapsedSinceLastSpawn: number;
  elapsedSinceLastItem: number;
  winner: string | null;
  caughtPlayer: string | null;
}
