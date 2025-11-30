// ==========================================
// Prompt Builder System - Main Entry Point
// World-class prompt generation for Retro Diffusion
// ==========================================

// Core builders
export { buildTilePrompt, quickTile } from './buildTilePrompt';
export { buildItemPrompt, quickItem } from './buildItemPrompt';
export { buildBackgroundPrompt, quickBackground } from './buildBackgroundPrompt';

// Types
export type {
  // Tile types
  TileType,
  TileTheme,
  TileView,
  SeamlessStrength,
  TilePromptOptions,
  // Item types
  ItemCategory,
  ItemTheme,
  ItemSize,
  GlowEffect,
  ItemOrientation,
  ItemPromptOptions,
  // Background types
  EnvironmentType,
  BackgroundView,
  TimeOfDay,
  BackgroundMood,
  BackgroundPromptOptions,
  // Shared types
  PixelStyle,
  PromptResult,
} from './types';

// Constants
export { PIXEL_STYLE_PROMPTS } from './types';

// Sanitizers
export {
  sanitizeTileInput,
  sanitizeItemInput,
  sanitizeBackgroundInput,
  getNegativeBase,
  TILE_BANNED,
  ITEM_BANNED,
  BACKGROUND_BANNED,
} from './sanitizer';

// Presets
export { TILE_PRESETS } from './presets/tilePresets';
export { ITEM_PRESETS } from './presets/itemPresets';
export { BACKGROUND_PRESETS } from './presets/backgroundPresets';

// ==========================================
// Convenience re-exports for common use cases
// ==========================================

/**
 * Quick access to all builders
 *
 * @example
 * import { builders } from '@/lib/prompts';
 * const tilePrompt = builders.tile('stone floor', { theme: 'dungeon' });
 * const itemPrompt = builders.item({ item: 'sword', theme: 'enchanted' });
 * const bgPrompt = builders.background('forest scene', { timeOfDay: 'sunset' });
 */
import { buildTilePrompt } from './buildTilePrompt';
import { buildItemPrompt } from './buildItemPrompt';
import { buildBackgroundPrompt } from './buildBackgroundPrompt';

export const builders = {
  tile: buildTilePrompt,
  item: buildItemPrompt,
  background: buildBackgroundPrompt,
};

/**
 * Quick helpers for common generation scenarios
 *
 * @example
 * import { quick } from '@/lib/prompts';
 * const forestBg = quick.background.forest('sunset');
 * const sword = quick.item.weapon('fire sword', 'enchanted', 'red');
 * const grassTile = quick.tile.grass();
 */
import { quickTile } from './buildTilePrompt';
import { quickItem } from './buildItemPrompt';
import { quickBackground } from './buildBackgroundPrompt';

export const quick = {
  tile: quickTile,
  item: quickItem,
  background: quickBackground,
};

/**
 * All presets in one object
 *
 * @example
 * import { presets } from '@/lib/prompts';
 * const dungeonFloor = presets.tiles.dungeonFloor;
 * const healthPotion = presets.items.healthPotion;
 * const forestDay = presets.backgrounds.forestDay;
 */
import { TILE_PRESETS } from './presets/tilePresets';
import { ITEM_PRESETS } from './presets/itemPresets';
import { BACKGROUND_PRESETS } from './presets/backgroundPresets';

export const presets = {
  tiles: TILE_PRESETS,
  items: ITEM_PRESETS,
  backgrounds: BACKGROUND_PRESETS,
};
