import { GameMap, TileType as T } from '../types';

const cols = 30;
const rows = 22;
const tiles: T[][] = [];
const heights: number[][] = [];

for (let r = 0; r < rows; r++) {
  tiles.push([]);
  heights.push([]);
  for (let c = 0; c < cols; c++) {
    tiles[r].push(
      r === 0 || r === rows - 1 || c === 0 || c === cols - 1 ? T.WALL : T.FLOOR
    );
    heights[r].push(0);
  }
}

// Internal walls — create corridors and barriers
const walls = [
  // Center-left pillar
  { x: 9, y: 9 }, { x: 9, y: 10 },
  // Center-right pillar
  { x: 20, y: 9 }, { x: 20, y: 10 },
  // Top barrier
  { x: 13, y: 5 }, { x: 14, y: 5 },
  // Bottom barrier
  { x: 15, y: 16 }, { x: 16, y: 16 },
  // Left corridor wall
  { x: 6, y: 13 }, { x: 6, y: 14 },
  // Right corridor wall
  { x: 23, y: 7 }, { x: 23, y: 8 },
];
for (const w of walls) {
  if (w.y > 0 && w.y < rows - 1 && w.x > 0 && w.x < cols - 1) {
    tiles[w.y][w.x] = T.WALL;
  }
}

// Height 1 platforms (crates, rubble — climbable)
const h1 = [
  // Top-left crate cluster
  { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 },
  // Top-right crates
  { x: 25, y: 3 }, { x: 26, y: 3 }, { x: 25, y: 4 }, { x: 26, y: 4 },
  // Mid-left platform
  { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 11 }, { x: 5, y: 11 },
  // Mid-right platform
  { x: 24, y: 10 }, { x: 25, y: 10 }, { x: 24, y: 11 }, { x: 25, y: 11 },
  // Bottom-left crates
  { x: 3, y: 17 }, { x: 4, y: 17 }, { x: 3, y: 18 }, { x: 4, y: 18 },
  // Bottom-right crates
  { x: 25, y: 17 }, { x: 26, y: 17 }, { x: 25, y: 18 }, { x: 26, y: 18 },
  // Center-ish stepping stones (adjacent to h2)
  { x: 13, y: 2 }, { x: 16, y: 2 },
  { x: 13, y: 19 }, { x: 16, y: 19 },
  { x: 7, y: 9 },
  { x: 22, y: 12 },
  // Scattered singles for variety
  { x: 11, y: 7 },
  { x: 18, y: 14 },
  { x: 15, y: 10 },
  { x: 12, y: 15 },
];
for (const b of h1) {
  if (b.y > 0 && b.y < rows - 1 && b.x > 0 && b.x < cols - 1 && tiles[b.y][b.x] !== T.WALL) {
    heights[b.y][b.x] = 1;
  }
}

// Height 2 platforms (tall containers — high vantage, needs h1 adjacent)
const h2 = [
  // Top-center container
  { x: 14, y: 2 }, { x: 15, y: 2 },
  // Bottom-center container
  { x: 14, y: 19 }, { x: 15, y: 19 },
  // Left tall structure (step at 7,9)
  { x: 7, y: 10 }, { x: 7, y: 11 },
  // Right tall structure (step at 22,12)
  { x: 22, y: 10 }, { x: 22, y: 11 },
];
for (const b of h2) {
  if (b.y > 0 && b.y < rows - 1 && b.x > 0 && b.x < cols - 1 && tiles[b.y][b.x] !== T.WALL) {
    heights[b.y][b.x] = 2;
  }
}

export const arenaMap: GameMap = {
  id: 'arena',
  name: 'Wasteland',
  nameKo: '황무지',
  cols,
  rows,
  tileSize: 30,
  tiles,
  heights,
  description: '좀비 대군을 피해 살아남아라',
  playerStartPositions: [
    { x: 13, y: 10 },
    { x: 16, y: 10 },
    { x: 14, y: 9 },
    { x: 15, y: 11 },
    { x: 14, y: 11 },
  ],
  edgeSpawns: [
    // Top edge
    { x: 3, y: 1 }, { x: 8, y: 1 }, { x: 14, y: 1 }, { x: 20, y: 1 }, { x: 27, y: 1 },
    // Bottom edge
    { x: 3, y: 20 }, { x: 8, y: 20 }, { x: 14, y: 20 }, { x: 20, y: 20 }, { x: 27, y: 20 },
    // Left edge
    { x: 1, y: 4 }, { x: 1, y: 10 }, { x: 1, y: 16 },
    // Right edge
    { x: 28, y: 4 }, { x: 28, y: 10 }, { x: 28, y: 16 },
  ],
};
