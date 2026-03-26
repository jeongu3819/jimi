export type Difficulty = 'easy' | 'normal' | 'hard';

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
  BOX = 2,           // 장애물 (이동 불가)
  ELEVATED = 3,      // 높은 지형 (플레이어만 올라갈 수 있음, hard 좀비는 가능)
  ITEM_SPAWN = 4,    // 아이템 스폰 위치 (바닥과 동일하게 이동 가능)
}

export interface GameMap {
  id: string;
  name: string;
  nameKo: string;
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[][];
  playerSpawn: Position;
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
  onElevated: boolean;
  speedBoostTimer: number;
  baseSpeed: number;
}

export interface Zombie extends Entity {
  type: Difficulty;
  canClimb: boolean;
  slowTimer: number;
  baseSpeed: number;
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
}

export interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'gameover';
  player: Player;
  zombies: Zombie[];
  items: Item[];
  map: GameMap;
  settings: GameSettings;
  survivalTime: number;
  score: number;
  elapsedSinceLastSpawn: number;
}
