// ==========================================
// Tile Presets - Common configurations
// ==========================================

import { TilePromptOptions } from '../types';

export const TILE_PRESETS: Record<string, TilePromptOptions> = {
  // Dungeon tiles
  dungeonFloor: {
    tileType: 'dungeon',
    theme: 'dungeon',
    view: 'top-down',
    seamlessStrength: 'strong',
  },
  dungeonWall: {
    tileType: 'wall',
    theme: 'dungeon',
    view: 'side',
    seamlessStrength: 'strong',
  },

  // Nature tiles
  grass: {
    tileType: 'grass',
    theme: 'nature',
    view: 'top-down',
    seamlessStrength: 'normal',
  },
  dirtPath: {
    tileType: 'ground',
    theme: 'nature',
    view: 'top-down',
    seamlessStrength: 'normal',
  },
  water: {
    tileType: 'water',
    theme: 'nature',
    view: 'top-down',
    seamlessStrength: 'normal',
  },
  sand: {
    tileType: 'sand',
    theme: 'nature',
    view: 'top-down',
    seamlessStrength: 'normal',
  },

  // Building tiles
  woodFloor: {
    tileType: 'wood',
    theme: 'fantasy',
    view: 'top-down',
    seamlessStrength: 'strong',
  },
  stoneFloor: {
    tileType: 'stone',
    theme: 'fantasy',
    view: 'top-down',
    seamlessStrength: 'strong',
  },
  brickWall: {
    tileType: 'brick',
    theme: 'fantasy',
    view: 'side',
    seamlessStrength: 'strong',
  },

  // Sci-fi tiles
  metalFloor: {
    tileType: 'metal',
    theme: 'scifi',
    view: 'top-down',
    seamlessStrength: 'strong',
  },
  techPanel: {
    tileType: 'tech',
    theme: 'scifi',
    view: 'top-down',
    seamlessStrength: 'strong',
  },

  // Hazard tiles
  lava: {
    tileType: 'lava',
    theme: 'dungeon',
    view: 'top-down',
    seamlessStrength: 'normal',
  },
  ice: {
    tileType: 'ice',
    theme: 'clean',
    view: 'top-down',
    seamlessStrength: 'normal',
  },

  // Special tiles
  crystal: {
    tileType: 'crystal',
    theme: 'fantasy',
    view: 'top-down',
    seamlessStrength: 'normal',
  },
};

export default TILE_PRESETS;
