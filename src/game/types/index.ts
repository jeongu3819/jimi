export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'last_survivor' | 'first_caught';

export interface Position { x: number; y: number; }
export interface Size { width: number; height: number; }

export enum TileType {
  FLOOR = 0,
  WALL = 1,
}

export type ZombieTier = 0 | 1 | 2;

export interface GameMap {
  id: string;
  name: string;
  nameKo: string;
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[][];
  heights: number[][];      // elevation per tile (0, 1, 2)
  playerStartPositions: Position[];
  edgeSpawns: Position[];
  description: string;
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
  elevation: number;
  isClimbing: boolean;
  climbProgress: number;
  climbFrom: Position;
  climbTo: Position;
  climbTargetElevation: number;
  facingAngle: number;
  facingX: number;
  facingY: number;
  walkCycle: number;
  deathTime: number;
  playerIndex: number;
  damageFlash: number;
}

export interface Zombie {
  id: string;
  position: Position;
  size: Size;
  speed: number;
  baseSpeed: number;
  alive: boolean;
  tier: ZombieTier;
  elevation: number;
  isClimbing: boolean;
  climbProgress: number;
  climbFrom: Position;
  climbTo: Position;
  climbTargetElevation: number;
  walkCycle: number;
  facingX: number;
  facingY: number;
  prevPosition: Position;
  stuckTime: number;
  escapeAngle: number;
  escapeTimer: number;
  mergeTimer: number;
}

export interface GameSettings {
  mapId: string;
  difficulty: Difficulty;
  gameMode: GameMode;
  playerCount: number;
  playerNames: string[];
}

export interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'gameover';
  players: Player[];
  zombies: Zombie[];
  map: GameMap;
  settings: GameSettings;
  survivalTime: number;
  prepTime: number;
  wave: number;
  lightLevel: number;       // 1.0 = bright, 0.0 = dark
  lightRadius: number;      // player vision radius in px
  elapsedSinceLastSpawn: number;
  winner: string | null;
  caughtPlayer: string | null;
}
