import { Item, ItemType, Position, Player } from '../types';

let itemIdCounter = 0;

const ITEM_SIZE = 18;
const ITEM_LIFETIME = 25;

const ITEM_TYPES = [ItemType.GUN_DAMAGE, ItemType.GUN_RATE, ItemType.WALL_REPAIR, ItemType.HEALTH_PACK];

export function createItem(pos: Position, type?: ItemType): Item {
  return {
    id: `item_${itemIdCounter++}`,
    position: { x: pos.x, y: pos.y },
    type: type ?? ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
    collected: false,
    lifetime: ITEM_LIFETIME,
  };
}

export function createItemAtTile(tileX: number, tileY: number, tileSize: number, type?: ItemType): Item {
  return createItem(
    { x: tileX * tileSize + tileSize / 2 - ITEM_SIZE / 2, y: tileY * tileSize + tileSize / 2 - ITEM_SIZE / 2 },
    type
  );
}

export function updateItem(item: Item, dt: number): Item {
  if (item.collected) return item;
  const lifetime = item.lifetime - dt;
  if (lifetime <= 0) return { ...item, collected: true };
  return { ...item, lifetime };
}

export function checkItemCollection(item: Item, player: Player): boolean {
  if (item.collected || !player.alive) return false;
  const dx = item.position.x - player.position.x;
  const dy = item.position.y - player.position.y;
  return (
    Math.abs(dx) < player.size.width &&
    Math.abs(dy) < player.size.height
  );
}

export const ITEM_RENDER_SIZE = ITEM_SIZE;
