import { GameMap, TileType as T, BaseConfig, Position } from '../types';

function makeBase(
  cx: number, cy: number,
  doorDir: 'up' | 'down' | 'left' | 'right'
): BaseConfig {
  const x = cx - 2;
  const y = cy - 1;
  const walls: Position[] = [];

  for (let c = x; c <= x + 4; c++) {
    if (!(doorDir === 'up' && c === cx)) walls.push({ x: c, y });
    if (!(doorDir === 'down' && c === cx)) walls.push({ x: c, y: y + 3 });
  }
  for (let r = y + 1; r <= y + 2; r++) {
    if (!(doorDir === 'left' && r === cy)) walls.push({ x, y: r });
    if (!(doorDir === 'right' && r === cy)) walls.push({ x: x + 4, y: r });
  }

  let doorTile: Position;
  switch (doorDir) {
    case 'up': doorTile = { x: cx, y }; break;
    case 'down': doorTile = { x: cx, y: y + 3 }; break;
    case 'left': doorTile = { x, y: cy }; break;
    case 'right': doorTile = { x: x + 4, y: cy }; break;
  }

  return {
    wallTiles: walls,
    doorTile,
    doorDir,
    spawnPos: { x: cx, y: cy },
    center: { x: cx, y: cy },
  };
}

const cols = 30;
const rows = 22;
const tiles: T[][] = [];

for (let r = 0; r < rows; r++) {
  const row: T[] = [];
  for (let c = 0; c < cols; c++) {
    if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
      row.push(T.WALL);
    } else {
      row.push(T.FLOOR);
    }
  }
  tiles.push(row);
}

// Terrain obstacles
const obstacles = [
  { x: 10, y: 8 }, { x: 11, y: 8 },
  { x: 18, y: 8 }, { x: 19, y: 8 },
  { x: 10, y: 13 }, { x: 11, y: 13 },
  { x: 18, y: 13 }, { x: 19, y: 13 },
  { x: 14, y: 6 }, { x: 15, y: 6 },
  { x: 14, y: 15 }, { x: 15, y: 15 },
];
for (const o of obstacles) {
  if (o.y < rows && o.x < cols) tiles[o.y][o.x] = T.WALL;
}

export const arenaMap: GameMap = {
  id: 'arena',
  name: 'Arena',
  nameKo: '아레나',
  cols,
  rows,
  tileSize: 30,
  description: '6개 기지 선점형 아레나',
  tiles,
  // 6 bases arranged around the map edges
  baseConfigs: [
    makeBase(4, 3, 'down'),       // 0: top-left
    makeBase(25, 3, 'down'),      // 1: top-right
    makeBase(4, 18, 'up'),        // 2: bottom-left
    makeBase(25, 18, 'up'),       // 3: bottom-right
    makeBase(14, 3, 'down'),      // 4: top-center
    makeBase(14, 18, 'up'),       // 5: bottom-center
  ],
  // All players start clustered near center (slightly spread so they don't overlap)
  playerStartPositions: [
    { x: 13, y: 10 },
    { x: 15, y: 10 },
    { x: 14, y: 9 },
    { x: 13, y: 11 },
    { x: 15, y: 11 },
  ],
  centerSpawn: { x: 14, y: 10 },
  edgeSpawns: [
    { x: 1, y: 10 }, { x: 28, y: 10 },
    { x: 14, y: 1 }, { x: 14, y: 20 },
    { x: 5, y: 10 }, { x: 24, y: 10 },
    { x: 8, y: 1 }, { x: 21, y: 1 },
    { x: 8, y: 20 }, { x: 21, y: 20 },
  ],
  itemSpawnArea: { minX: 6, maxX: 23, minY: 6, maxY: 16 },
};
