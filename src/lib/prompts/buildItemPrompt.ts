// ==========================================
// Item/Weapon/Icon Prompt Builder
// Generates clean inventory icons or item sheets
// ==========================================

import {
  ItemCategory,
  ItemTheme,
  ItemSize,
  GlowEffect,
  ItemPromptOptions,
  PromptResult,
  PixelStyle,
  ColorPalette,
  PIXEL_STYLE_PROMPTS,
  PALETTE_PROMPTS,
} from './types';
import { sanitizeItemInput } from './sanitizer';

// Short size descriptors
const SIZE_WORDS: Record<ItemSize, string> = {
  tiny: 'tiny',
  small: 'small',
  medium: 'medium',
  large: 'large',
  massive: 'huge',
};

// Short category words
const CATEGORY_WORDS: Record<ItemCategory, string> = {
  weapon: 'weapon',
  armor: 'armor',
  consumable: 'potion',
  tool: 'tool',
  key_item: 'key item',
  material: 'material',
  currency: 'coin',
  container: 'chest',
  accessory: 'accessory',
  ammo: 'ammo',
  food: 'food',
  misc: '',
};

// Short theme words
const THEME_WORDS: Record<ItemTheme, string> = {
  basic: '',
  rusty: 'rusty',
  polished: 'polished',
  golden: 'golden',
  silver: 'silver',
  bronze: 'bronze',
  iron: 'iron',
  steel: 'steel',
  wooden: 'wooden',
  stone: 'stone',
  bone: 'bone',
  crystal: 'crystal',
  glass: 'glass',
  enchanted: 'enchanted glowing',
  cursed: 'cursed dark',
  corrupted: 'corrupted',
  demonic: 'demonic',
  holy: 'holy radiant',
  elven: 'elven',
  dwarven: 'dwarven',
  orcish: 'orcish',
  undead: 'undead',
  dragon: 'dragon',
  void: 'void',
  arcane: 'arcane',
  futuristic: 'futuristic',
  cyber: 'cyberpunk',
  plasma: 'plasma',
  laser: 'laser',
  neon: 'neon',
  holographic: 'holographic',
  military: 'military',
  industrial: 'industrial',
  broken: 'broken',
  ancient: 'ancient',
  pristine: 'pristine',
  legendary: 'legendary',
};

// Glow colors
const GLOW_WORDS: Record<GlowEffect, string> = {
  none: '',
  red: 'red glow',
  blue: 'blue glow',
  green: 'green glow',
  purple: 'purple glow',
  gold: 'golden glow',
  white: 'white glow',
  orange: 'orange glow',
  pink: 'pink glow',
  cyan: 'cyan glow',
  teal: 'teal glow',
};

// Extended options with sheetMode and palette
export interface ItemPromptOptionsExtended extends ItemPromptOptions {
  sheetMode?: boolean;  // Generate item sheet instead of single item
  sheetCount?: number;  // Number of items in sheet (default 4)
  pixelStyle?: PixelStyle;
  palette?: ColorPalette;
}

// ==========================================
// MAIN BUILDER FUNCTION
// ==========================================

export function buildItemPrompt(options: ItemPromptOptionsExtended): PromptResult {
  const {
    item,
    category = 'misc',
    size = 'medium',
    theme = 'basic',
    glow = 'none',
    details,
    orientation = 'vertical',
    sheetMode = false,
    sheetCount = 4,
    pixelStyle = '16-bit',
    palette = 'default',
  } = options;

  const sanitizedItem = sanitizeItemInput(item || '');
  const parts: string[] = [];

  // Core - different for sheet vs single
  if (sheetMode) {
    parts.push(`item sheet, ${sheetCount} variations`);
    parts.push('grid layout, organized');
  } else {
    parts.push('single isolated item');
    parts.push('centered, no hands, no character');
  }

  // Item description
  const themeWord = THEME_WORDS[theme];
  const sizeWord = SIZE_WORDS[size];
  const categoryWord = CATEGORY_WORDS[category];

  // Build item phrase: "small golden sword" or "enchanted health potion"
  const itemPhrase = [sizeWord, themeWord, sanitizedItem || categoryWord]
    .filter(Boolean)
    .join(' ');
  parts.push(itemPhrase);

  // Glow
  if (glow !== 'none') {
    parts.push(GLOW_WORDS[glow]);
  }

  // Orientation (for single items)
  if (!sheetMode && orientation === 'vertical') {
    parts.push('vertical');
  } else if (!sheetMode && orientation === 'horizontal') {
    parts.push('horizontal');
  }

  // Details
  if (details) {
    parts.push(sanitizeItemInput(details));
  }

  // Pixel style
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // Palette
  if (palette !== 'default' && PALETTE_PROMPTS[palette]) {
    parts.push(PALETTE_PROMPTS[palette]);
  }

  // Core style
  parts.push('game icon');

  // Negative prompt - AGGRESSIVE about no characters
  const negativePrompt = sheetMode
    ? 'character, person, hands, blurry, realistic, 3d'
    : 'character, person, hands, holding, arm, body, sprite, figure, blurry, realistic, 3d, multiple items, scattered';

  // Style selection
  let style: string;
  if (sheetMode) {
    style = 'item_sheet';
  } else if (category === 'weapon' || category === 'accessory' || category === 'currency') {
    style = 'skill_icon';
  } else {
    style = 'topdown_item';
  }

  return {
    prompt: parts.join(', '),
    negativePrompt,
    style,
  };
}

// ==========================================
// QUICK HELPERS
// ==========================================

export const quickItem = {
  /** Single item */
  single: (item: string, theme: ItemTheme = 'basic') =>
    buildItemPrompt({ item, theme }),

  /** Item sheet with variations */
  sheet: (item: string, count: number = 4) =>
    buildItemPrompt({ item, sheetMode: true, sheetCount: count }),

  /** Weapon */
  weapon: (item: string, theme: ItemTheme = 'steel', glow: GlowEffect = 'none') =>
    buildItemPrompt({ item, category: 'weapon', theme, glow }),

  /** Potion */
  potion: (item: string, glow: GlowEffect = 'red') =>
    buildItemPrompt({ item, category: 'consumable', theme: 'glass', glow, size: 'small' }),

  /** Armor */
  armor: (item: string, theme: ItemTheme = 'steel') =>
    buildItemPrompt({ item, category: 'armor', theme }),

  /** Accessory */
  accessory: (item: string, theme: ItemTheme = 'golden') =>
    buildItemPrompt({ item, category: 'accessory', theme, size: 'tiny' }),

  /** Coin */
  coin: (theme: ItemTheme = 'golden') =>
    buildItemPrompt({ item: 'coin', category: 'currency', theme, size: 'tiny' }),

  /** Food */
  food: (item: string) =>
    buildItemPrompt({ item, category: 'food', size: 'small' }),

  /** Magical item */
  magical: (item: string, glow: GlowEffect = 'purple') =>
    buildItemPrompt({ item, theme: 'enchanted', glow }),

  /** Sci-fi weapon */
  scifiWeapon: (item: string, glow: GlowEffect = 'cyan') =>
    buildItemPrompt({ item, category: 'weapon', theme: 'futuristic', glow }),
};

export default buildItemPrompt;
