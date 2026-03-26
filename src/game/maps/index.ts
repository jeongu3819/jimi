import { GameMap } from '../types';
import { arenaMap } from './arena';

export const maps: Record<string, GameMap> = {
  arena: arenaMap,
};

export const mapList = Object.values(maps);
