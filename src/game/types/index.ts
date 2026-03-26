export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'last_survivor' | 'first_caught';
export type VisionMode = 'normal' | 'blackout';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  BOX = 2,
  ELEVATED = 3,
  ITEM_SPAWN = 4,
}

export interface GameMap {
  id: string;
  name: string;
  nameKo: string;
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[][];
  playerSpawns: Position[];  // multiple spawn points
  zombieSpawns: Position[];
  itemSpawns: Position[];
  description: string;
}

export interface Entity {
  id: string;
  position: Position;
  size: Size;
  speed: number;
  alive: boolean;
}

export interface Player extends Entity {
  name: string;
  color: string;
  onElevated: boolean;
  elevatedTime: number;       // how long on elevated (for penalty)
  speedBoostTimer: number;
  baseSpeed: number;
  shieldAvailable: boolean;
  shieldActive: boolean;
  shieldTimer: number;
  stunTimer: number;          // webbed/stunned
  slowTimer: number;          // slowed by web
  facingX: number;            // last movement direction
  facingY: number;
  walkCycle: number;          // animation cycle
  deathTime: number;          // when this player died (for ordering)
  playerIndex: number;        // for input binding
}

export interface Zombie extends Entity {
  type: Difficulty;
  canClimb: boolean;
  slowTimer: number;
  baseSpeed: number;
  // Stuck detection
  prevPosition: Position;
  stuckTime: number;
  escapeAngle: number;
  escapeTimer: number;
  // Skill
  hasWebSkill: boolean;
  webCooldown: number;
  webChargeTimer: number;     // >0 means charging (telegraph)
  webTargetDir: Position | null;
  walkCycle: number;
  facingX: number;
  facingY: number;
}

export interface Projectile {
  id: string;
  position: Position;
  velocity: Position;
  lifetime: number;
  type: 'web';
}

export interface Item {
  id: string;
  position: Position;
  type: ItemType;
  collected: boolean;
  respawnTimer: number;
}

export enum ItemType {
  SPEED_BOOST = 'speed_boost',
  ZOMBIE_SLOW = 'zombie_slow',
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
  projectiles: Projectile[];
  items: Item[];
  map: GameMap;
  settings: GameSettings;
  survivalTime: number;
  score: number;
  elapsedSinceLastSpawn: number;
  winner: string | null;
  caughtPlayer: string | null;
}
