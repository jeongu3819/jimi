import { Item, ItemType, Position, Player } from '../types';

let itemIdCounter = 0;

const ITEM_SIZE = 20;
const ITEM_RESPAWN_TIME = 12; // seconds

export function createItem(spawnPos: Position, tileSize: number, type: ItemType): Item {
  return {
    id: `item_${itemIdCounter++}`,
    position: {
      x: spawnPos.x * tileSize + tileSize / 2 - ITEM_SIZE / 2,
      y: spawnPos.y * tileSize + tileSize / 2 - ITEM_SIZE / 2,
    },
    type,
    collected: false,
    respawnTimer: 0,
  };
}

export function updateItem(item: Item, dt: number): Item {
  if (!item.collected) return item;
  const updated = { ...item };
  updated.respawnTimer -= dt;
  if (updated.respawnTimer <= 0) {
    updated.collected = false;
    updated.respawnTimer = 0;
  }
  return updated;
}

export function checkItemCollection(item: Item, player: Player): boolean {
  if (item.collected || !player.alive) return false;
  const ix = item.position.x;
  const iy = item.position.y;
  const px = player.position.x;
  const py = player.position.y;

  return (
    ix < px + player.size.width &&
    ix + ITEM_SIZE > px &&
    iy < py + player.size.height &&
    iy + ITEM_SIZE > py
  );
}

export function collectItem(item: Item): Item {
  return { ...item, collected: true, respawnTimer: ITEM_RESPAWN_TIME };
}

export const ITEM_RENDER_SIZE = ITEM_SIZE;
