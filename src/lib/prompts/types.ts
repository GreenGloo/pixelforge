// ==========================================
// Shared Types for Prompt Builder System
// ==========================================

/** Output format for all prompt builders */
export interface PromptResult {
  prompt: string;
  negativePrompt: string;
  style: string; // Recommended Retro Diffusion style
}

/** Pixel art style eras */
export type PixelStyle = '8-bit' | '16-bit' | '32-bit' | 'hd-pixel';

/** Color palette presets */
export type ColorPalette =
  | 'default'
  | 'gameboy'
  | 'nes'
  | 'snes'
  | 'pico8'
  | 'endesga32'
  | 'fantasy'
  | 'cyberpunk'
  | 'nature'
  | 'monochrome';

// ==========================================
// TILE TYPES
// ==========================================

export type TileType =
  | 'floor'
  | 'wall'
  | 'ground'
  | 'water'
  | 'lava'
  | 'grass'
  | 'stone'
  | 'wood'
  | 'metal'
  | 'fabric'
  | 'organic'
  | 'tech'
  | 'brick'
  | 'ice'
  | 'sand'
  | 'snow'
  | 'crystal'
  | 'dungeon'
  | 'sci-fi'
  | 'custom';

export type TileTheme =
  | 'fantasy'
  | 'dungeon'
  | 'nature'
  | 'scifi'
  | 'horror'
  | 'industrial'
  | 'ancient'
  | 'clean'
  | 'worn'
  | 'custom';

export type TileView = 'top-down' | 'side' | 'isometric';

export type SeamlessStrength = 'subtle' | 'normal' | 'strong';

export interface TilePromptOptions {
  tileType?: TileType;
  theme?: TileTheme;
  view?: TileView;
  colors?: string;
  details?: string;
  pixelStyle?: PixelStyle;
  seamlessStrength?: SeamlessStrength;
  seamless?: boolean; // Alias for seamlessStrength !== 'subtle'
  size?: number;
}

// ==========================================
// ITEM TYPES
// ==========================================

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'tool'
  | 'key_item'
  | 'material'
  | 'currency'
  | 'container'
  | 'accessory'
  | 'ammo'
  | 'food'
  | 'misc';

export type ItemTheme =
  // Materials
  | 'basic'
  | 'rusty'
  | 'polished'
  | 'golden'
  | 'silver'
  | 'bronze'
  | 'iron'
  | 'steel'
  | 'wooden'
  | 'stone'
  | 'bone'
  | 'crystal'
  | 'glass'
  // Fantasy
  | 'enchanted'
  | 'cursed'
  | 'corrupted'
  | 'demonic'
  | 'holy'
  | 'elven'
  | 'dwarven'
  | 'orcish'
  | 'undead'
  | 'dragon'
  | 'void'
  | 'arcane'
  // Sci-fi
  | 'futuristic'
  | 'cyber'
  | 'plasma'
  | 'laser'
  | 'neon'
  | 'holographic'
  | 'military'
  | 'industrial'
  // Condition
  | 'broken'
  | 'ancient'
  | 'pristine'
  | 'legendary';

export type ItemSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive';

export type GlowEffect =
  | 'none'
  | 'red'
  | 'blue'
  | 'green'
  | 'purple'
  | 'gold'
  | 'white'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'teal';

export type ItemOrientation = 'vertical' | 'horizontal' | 'auto';

export interface ItemPromptOptions {
  item: string;
  category?: ItemCategory;
  size?: ItemSize;
  theme?: ItemTheme;
  glow?: GlowEffect;
  material?: string;
  details?: string;
  pixelStyle?: PixelStyle;
  orientation?: ItemOrientation;
  includeEffects?: boolean;
  isInventoryIcon?: boolean;
}

// ==========================================
// BACKGROUND TYPES
// ==========================================

export type BackgroundView =
  | 'side-scroll'
  | 'top-down'
  | 'parallax-sky'
  | 'parallax-mid'
  | 'parallax-fore';

export type EnvironmentType =
  | 'dungeon'
  | 'forest'
  | 'city'
  | 'village'
  | 'castle'
  | 'cave'
  | 'desert'
  | 'snow'
  | 'ocean'
  | 'underwater'
  | 'sky'
  | 'space'
  | 'spaceship'
  | 'cyberpunk'
  | 'industrial'
  | 'ruins'
  | 'graveyard'
  | 'swamp'
  | 'volcano'
  | 'library'
  | 'temple'
  | 'arena'
  | 'custom';

export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn' | 'stormy';

export type BackgroundMood =
  | 'peaceful'
  | 'ominous'
  | 'mysterious'
  | 'magical'
  | 'dangerous'
  | 'abandoned'
  | 'lively'
  | 'ancient'
  | 'futuristic'
  | 'haunted';

export interface BackgroundPromptOptions {
  environment?: EnvironmentType;
  view?: BackgroundView;
  timeOfDay?: TimeOfDay;
  mood?: string;
  colors?: string;
  details?: string;
  pixelStyle?: PixelStyle;
  includeCharacters?: boolean;
  seamless?: boolean;
  width?: number;
  height?: number;
}

// ==========================================
// PIXEL STYLE DESCRIPTIONS
// ==========================================

export const PIXEL_STYLE_PROMPTS: Record<PixelStyle, string> = {
  '8-bit': 'retro 8-bit style, limited colors, chunky pixels, NES era',
  '16-bit': '16-bit style, SNES era, vibrant colors, detailed sprites',
  '32-bit': '32-bit style, PlayStation era, smooth gradients, high detail',
  'hd-pixel': 'HD pixel art, modern pixel art, high resolution pixels, detailed',
};

// ==========================================
// COLOR PALETTE DESCRIPTIONS
// ==========================================

export const PALETTE_PROMPTS: Record<ColorPalette, string> = {
  default: '',
  gameboy: 'gameboy color palette, 4 shades of green, monochrome green',
  nes: 'NES color palette, limited colors, retro 8-bit colors',
  snes: 'SNES color palette, 16-bit colors, vibrant retro',
  pico8: 'PICO-8 palette, 16 colors, retro indie game style',
  endesga32: 'endesga-32 palette, warm colors, indie game aesthetic',
  fantasy: 'warm fantasy colors, golden highlights, rich earth tones',
  cyberpunk: 'cyberpunk palette, neon pink, cyan, dark purple, high contrast',
  nature: 'nature palette, forest greens, earth browns, natural tones',
  monochrome: 'monochrome palette, single color variations, grayscale with tint',
};
