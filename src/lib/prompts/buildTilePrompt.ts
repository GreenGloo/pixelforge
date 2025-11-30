// ==========================================
// Tile/Texture Prompt Builder
// Generates seamless, tileable textures for game environments
// ==========================================

import {
  TileType,
  TileTheme,
  TileView,
  TilePromptOptions,
  PromptResult,
  PIXEL_STYLE_PROMPTS,
} from './types';
import { sanitizeTileInput, getNegativeBase } from './sanitizer';

// ==========================================
// TILE TYPE DESCRIPTIONS
// ==========================================

const TILE_TYPE_PROMPTS: Record<TileType, string> = {
  floor: 'floor tile, indoor flooring, smooth walking surface',
  wall: 'wall texture, vertical surface, brick or stone pattern',
  ground: 'ground texture, outdoor terrain, natural earth surface',
  water: 'water tile, blue water surface, gentle ripple pattern, liquid texture',
  lava: 'lava tile, molten rock, orange red magma, glowing hot surface, flowing molten',
  grass: 'grass tile, green vegetation, natural lawn texture, blades of grass',
  stone: 'stone tile, gray rock surface, cobblestone or flagstone pattern',
  wood: 'wooden planks, wood grain texture, deck boards, timber floor',
  metal: 'metal tile, iron plates, industrial surface, metallic sheen, rivets',
  fabric: 'fabric texture, cloth pattern, textile weave, carpet or tapestry',
  organic: 'organic texture, flesh, scales, living tissue, biological surface',
  tech: 'sci-fi panel, futuristic floor, tech surface, circuit patterns, glowing elements',
  brick: 'brick tile, red clay bricks, mortar lines, masonry pattern',
  ice: 'ice tile, frozen surface, transparent blue, crystalline, slippery',
  sand: 'sand tile, desert texture, grainy surface, beach sand, dunes',
  snow: 'snow tile, white powder snow, ice crystals, winter ground',
  crystal: 'crystal tile, gemstone surface, faceted, refractive, prismatic',
  dungeon: 'dungeon floor, dark stone blocks, ancient mortar, moss in cracks',
  'sci-fi': 'sci-fi floor panel, futuristic metal grating, LED strips, high-tech',
  custom: '',
};

// ==========================================
// TILE THEME DESCRIPTIONS
// ==========================================

const TILE_THEME_PROMPTS: Record<TileTheme, string> = {
  fantasy: 'fantasy style, medieval aesthetic, magical atmosphere',
  dungeon: 'dark dungeon, underground, mysterious shadows, torch-lit',
  nature: 'natural, organic, outdoor environment, earthen',
  scifi: 'science fiction, futuristic, high-tech, metallic',
  horror: 'horror style, dark, creepy, unsettling, decay',
  industrial: 'industrial, factory, machinery, pipes and gears',
  ancient: 'ancient ruins, weathered, historical, archaeological',
  clean: 'pristine, polished, well-maintained, modern',
  worn: 'worn, damaged, weathered, battle-scarred, aged',
  custom: '',
};

// ==========================================
// TILE VIEW DESCRIPTIONS
// ==========================================

const TILE_VIEW_PROMPTS: Record<TileView, string> = {
  'top-down': 'top-down view, overhead perspective, bird eye view, looking straight down',
  side: 'side view, platformer style, horizontal orientation, profile view',
  isometric: 'isometric view, 45 degree angle, diamond shape, 2.5D perspective',
};

// ==========================================
// SEAMLESSNESS ENFORCEMENT
// ==========================================

const SEAMLESS_STRENGTH_PROMPTS = {
  subtle: 'tileable, continuous pattern',
  normal: 'seamless tile, tileable texture, repeating pattern, continuous edges',
  strong:
    'perfectly seamless tile, tileable texture, repeating pattern, continuous edges, no visible seams, edges blend perfectly, pattern continues infinitely',
};

// ==========================================
// MAIN BUILDER FUNCTION
// ==========================================

export function buildTilePrompt(
  description: string,
  options: TilePromptOptions = {}
): PromptResult {
  const {
    tileType = 'custom',
    theme = 'fantasy',
    view = 'top-down',
    colors,
    details,
    pixelStyle = '16-bit',
    seamlessStrength = 'normal',
    size = 32,
  } = options;

  // Sanitize user input - remove words that break seamlessness
  const sanitizedDesc = sanitizeTileInput(description || '');
  const sanitizedDetails = details ? sanitizeTileInput(details) : '';

  const parts: string[] = [];

  // ==========================================
  // 1. CORE TILE INSTRUCTIONS (Critical for seamlessness)
  // ==========================================
  parts.push('pixel art game tile');
  parts.push(SEAMLESS_STRENGTH_PROMPTS[seamlessStrength]);

  // ==========================================
  // 2. VIEW TYPE (Important for correct perspective)
  // ==========================================
  parts.push(TILE_VIEW_PROMPTS[view]);

  // ==========================================
  // 3. TILE TYPE
  // ==========================================
  if (tileType !== 'custom' && TILE_TYPE_PROMPTS[tileType]) {
    parts.push(TILE_TYPE_PROMPTS[tileType]);
  }

  // ==========================================
  // 4. THEME
  // ==========================================
  if (theme !== 'custom' && TILE_THEME_PROMPTS[theme]) {
    parts.push(TILE_THEME_PROMPTS[theme]);
  }

  // ==========================================
  // 5. USER DESCRIPTION (sanitized)
  // ==========================================
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // ==========================================
  // 6. CUSTOM DETAILS (sanitized)
  // ==========================================
  if (sanitizedDetails) {
    parts.push(sanitizedDetails);
  }

  // ==========================================
  // 7. COLOR SPECIFICATION
  // ==========================================
  if (colors) {
    parts.push(`color palette: ${colors}`);
  }

  // ==========================================
  // 8. LIGHTING (Critical for seamless tiles)
  // ==========================================
  parts.push('consistent lighting');
  parts.push('even illumination');
  parts.push('no strong directional shadows');
  parts.push('ambient lighting only');

  // ==========================================
  // 9. PIXEL STYLE
  // ==========================================
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // ==========================================
  // 10. SIZE AND QUALITY
  // ==========================================
  parts.push(`${size}x${size} pixels`);
  parts.push('clean pixel art');
  parts.push('game asset');
  parts.push('clean pixel edges');

  // ==========================================
  // BUILD NEGATIVE PROMPT
  // ==========================================
  const negativePrompt = getNegativeBase('tile');

  // ==========================================
  // DETERMINE BEST RETRO DIFFUSION STYLE
  // ==========================================
  let style = 'topdown_asset';
  if (view === 'isometric') {
    style = 'isometric_asset';
  } else if (view === 'side') {
    style = 'default';
  }

  return {
    prompt: parts.filter(Boolean).join(', '),
    negativePrompt,
    style,
  };
}

// ==========================================
// QUICK HELPER FUNCTIONS
// ==========================================

export const quickTile = {
  /** Basic tile with just type */
  basic: (tileType: TileType) => buildTilePrompt('', { tileType }),

  /** Tile with type and theme */
  themed: (tileType: TileType, theme: TileTheme) =>
    buildTilePrompt('', { tileType, theme }),

  /** Side-view tile for platformers */
  platformer: (tileType: TileType) =>
    buildTilePrompt('', { tileType, view: 'side' }),

  /** Top-down RPG tile */
  rpg: (tileType: TileType) =>
    buildTilePrompt('', { tileType, view: 'top-down' }),

  /** Isometric tile */
  isometric: (tileType: TileType) =>
    buildTilePrompt('', { tileType, view: 'isometric' }),

  /** Dungeon floor */
  dungeonFloor: () =>
    buildTilePrompt('dark stone floor with moss in cracks', {
      tileType: 'dungeon',
      theme: 'dungeon',
      view: 'top-down',
    }),

  /** Grass ground */
  grass: () =>
    buildTilePrompt('lush green grass', {
      tileType: 'grass',
      theme: 'nature',
      view: 'top-down',
    }),

  /** Water */
  water: () =>
    buildTilePrompt('calm blue water with gentle ripples', {
      tileType: 'water',
      theme: 'nature',
      view: 'top-down',
    }),

  /** Sci-fi floor */
  scifiFloor: () =>
    buildTilePrompt('metallic floor panels with glowing circuits', {
      tileType: 'sci-fi',
      theme: 'scifi',
      view: 'top-down',
    }),
};

export default buildTilePrompt;
