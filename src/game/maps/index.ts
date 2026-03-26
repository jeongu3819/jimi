import { GameMap } from '../types';
import { warehouseMap } from './warehouse';
import { parkMap } from './park';
import { mazeMap } from './maze';

export const maps: Record<string, GameMap> = {
  warehouse: warehouseMap,
  park: parkMap,
  maze: mazeMap,
};

export const mapList = Object.values(maps);
