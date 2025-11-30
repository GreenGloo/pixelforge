// ==========================================
// World-Class Prompt Builder System for Retro Diffusion
// Generates optimized prompts with negative prompts for pixel art
// ==========================================

// ==========================================
// SHARED TYPES & INTERFACES
// ==========================================

export interface PromptResult {
  prompt: string;
  negativePrompt: string;
  style: string; // Recommended Retro Diffusion style
}

export type PixelStyle = '8-bit' | '16-bit' | '32-bit' | 'hd-pixel';

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
// SANITIZATION - Remove problematic words
// ==========================================

// Words that create messy outputs across all categories
const UNIVERSAL_BANNED_WORDS = [
  'realistic',
  'photorealistic',
  'photograph',
  'photo',
  '3d render',
  'blender',
  'unreal engine',
  'octane',
  'ray tracing',
  'hyperrealistic',
];

// Words that break item/icon generation
const ITEM_BANNED_WORDS = [
  'wisps',
  'wispy',
  'smoke',
  'smoking',
  'particles',
  'particle',
  'dripping',
  'drip',
  'floating',
  'aura',
  'mist',
  'misty',
  'fog',
  'foggy',
  'glow effect',
  'glowing particles',
  'sparkles',
  'sparkling',
  'ethereal',
  'ghostly',
  'translucent',
  'blur',
  'blurry',
  'motion blur',
  'blood drip',
  'blood splatter',
];

// Words that break tile seamlessness
const TILE_BANNED_WORDS = [
  'unique',
  'centered object',
  'focal point',
  'single',
  'one',
  'centered',
  'main subject',
  'hero',
  'character',
  'person',
  'creature',
  'monster',
  'animal',
];

// Words that break background flat composition
const BACKGROUND_BANNED_WORDS = [
  '3d',
  'depth',
  'perspective',
  'vanishing point',
  'fisheye',
  'tilted',
  'angled',
  'diagonal',
  'portrait',
  'close-up',
  'zoom',
  'first person',
  'pov',
];

/**
 * Sanitize user input by removing problematic words
 */
function sanitizeInput(input: string, bannedWords: string[]): string {
  let sanitized = input.toLowerCase();

  // Remove all banned words (case insensitive)
  for (const word of bannedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  // Clean up multiple spaces and trim
  return sanitized.replace(/\s+/g, ' ').trim();
}

// ==========================================
// PIXEL STYLE DESCRIPTIONS
// ==========================================

const PIXEL_STYLE_PROMPTS: Record<PixelStyle, string> = {
  '8-bit': 'retro 8-bit style, limited colors, chunky pixels, NES era',
  '16-bit': '16-bit style, SNES era, vibrant colors, detailed sprites',
  '32-bit': '32-bit style, PlayStation era, smooth gradients, high detail',
  'hd-pixel': 'HD pixel art, modern pixel art, high resolution pixels, detailed',
};

// ==========================================
// COLOR PALETTE PROMPTS
// ==========================================

const PALETTE_PROMPTS: Record<ColorPalette, string> = {
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

// ==========================================
// 1. TILE PROMPT BUILDER
// ==========================================

export type TileType =
  | 'floor'
  | 'wall'
  | 'ground'
  | 'water'
  | 'lava'
  | 'grass'
  | 'stone'
  | 'metal'
  | 'wood'
  | 'brick'
  | 'sand'
  | 'snow'
  | 'ice'
  | 'sci-fi'
  | 'dungeon'
  | 'custom';

export type TileView = 'top-down' | 'side' | 'isometric';

export interface TilePromptOptions {
  tileType?: TileType;
  view?: TileView;
  palette?: ColorPalette;
  pixelStyle?: PixelStyle;
  seamless?: boolean;
  size?: number;
}

const TILE_TYPE_PROMPTS: Record<TileType, string> = {
  floor: 'floor tile, indoor flooring, smooth surface',
  wall: 'wall texture, vertical surface, brick or stone pattern',
  ground: 'ground texture, outdoor terrain, natural surface',
  water: 'water tile, blue water surface, ripple pattern, liquid texture',
  lava: 'lava tile, molten rock, orange red magma, glowing hot surface',
  grass: 'grass tile, green vegetation, natural lawn, outdoor ground',
  stone: 'stone tile, gray rock surface, cobblestone pattern',
  metal: 'metal tile, iron plates, industrial surface, metallic sheen',
  wood: 'wooden planks, wood grain texture, deck floor',
  brick: 'brick tile, red brick pattern, masonry texture',
  sand: 'sand tile, desert texture, beach ground, grainy surface',
  snow: 'snow tile, white winter surface, ice crystals',
  ice: 'ice tile, frozen surface, transparent blue, slippery',
  'sci-fi': 'sci-fi panel, futuristic floor, tech surface, circuit pattern',
  dungeon: 'dungeon floor, dark stone, ancient brick, mossy cracks',
  custom: '',
};

const TILE_VIEW_PROMPTS: Record<TileView, string> = {
  'top-down': 'top-down view, overhead perspective, bird eye view',
  'side': 'side view, platformer style, horizontal orientation',
  'isometric': 'isometric view, 45 degree angle, diamond shape',
};

export function buildTilePrompt(
  description: string,
  options: TilePromptOptions = {}
): PromptResult {
  const {
    tileType = 'custom',
    view = 'top-down',
    palette = 'default',
    pixelStyle = '16-bit',
    seamless = true,
    size = 32,
  } = options;

  // Sanitize user input
  const sanitizedDesc = sanitizeInput(
    description,
    [...UNIVERSAL_BANNED_WORDS, ...TILE_BANNED_WORDS]
  );

  const parts: string[] = [];

  // Core tile instructions
  parts.push('pixel art game tile');
  parts.push('seamless tile');
  parts.push('tileable texture');
  parts.push('repeating pattern');

  // View type
  parts.push(TILE_VIEW_PROMPTS[view]);

  // Tile type preset
  if (tileType !== 'custom' && TILE_TYPE_PROMPTS[tileType]) {
    parts.push(TILE_TYPE_PROMPTS[tileType]);
  }

  // User description
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // Seamless instructions
  if (seamless) {
    parts.push('seamless edges');
    parts.push('no visible seams');
    parts.push('continuous pattern');
  }

  // Lighting for consistency
  parts.push('consistent lighting');
  parts.push('even illumination');
  parts.push('no strong shadows');

  // Pixel style
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // Palette
  if (palette !== 'default') {
    parts.push(PALETTE_PROMPTS[palette]);
  }

  // Size hint
  parts.push(`${size}x${size} pixels`);

  // Quality markers
  parts.push('clean pixel art');
  parts.push('game asset');

  // Build negative prompt
  const negativePrompt = [
    'border',
    'edge visible',
    'seam visible',
    'non-repeating',
    'single object centered',
    'character',
    'creature',
    'person',
    'unique element',
    'focal point',
    'blurry',
    'anti-aliased',
    'smooth gradients',
    '3d render',
    'photograph',
    'realistic',
  ].join(', ');

  return {
    prompt: parts.filter(Boolean).join(', '),
    negativePrompt,
    style: view === 'isometric' ? 'isometric_asset' : 'topdown_asset',
  };
}

// ==========================================
// 2. ITEM PROMPT BUILDER
// ==========================================

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'tool'
  | 'accessory'
  | 'material'
  | 'key-item'
  | 'currency'
  | 'custom';

export type ItemSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive';

export type ItemTheme =
  | 'medieval'
  | 'modern'
  | 'sci-fi'
  | 'fantasy'
  | 'steampunk'
  | 'cyberpunk'
  | 'nature'
  | 'dark'
  | 'holy'
  | 'custom';

export interface ItemPromptOptions {
  category?: ItemCategory;
  size?: ItemSize;
  theme?: ItemTheme;
  orientation?: 'vertical' | 'horizontal' | 'diagonal';
  palette?: ColorPalette;
  pixelStyle?: PixelStyle;
  iconSize?: number;
}

const ITEM_SIZE_PROMPTS: Record<ItemSize, string> = {
  tiny: 'very small, compact, pocket-sized, miniature item',
  small: 'small item, handheld size, one-handed',
  medium: 'medium sized, standard proportions, balanced size',
  large: 'large item, two-handed size, imposing',
  massive: 'massive, oversized, huge, giant weapon',
};

const ITEM_CATEGORY_PROMPTS: Record<ItemCategory, string> = {
  weapon: 'weapon, combat item, offensive tool',
  armor: 'armor piece, protective gear, defensive equipment',
  consumable: 'consumable item, potion bottle, food, medicine',
  tool: 'tool, utility item, crafting equipment',
  accessory: 'accessory, jewelry, ring, amulet, charm',
  material: 'crafting material, resource, ingredient, raw material',
  'key-item': 'key item, quest object, important artifact',
  currency: 'currency, coin, gem, treasure',
  custom: '',
};

const ITEM_THEME_PROMPTS: Record<ItemTheme, string> = {
  medieval: 'medieval style, ancient, forged metal, leather wrapped',
  modern: 'modern style, contemporary design, sleek',
  'sci-fi': 'sci-fi style, futuristic, high-tech, glowing elements',
  fantasy: 'fantasy style, magical, enchanted, mystical',
  steampunk: 'steampunk style, brass, gears, Victorian machinery',
  cyberpunk: 'cyberpunk style, neon accents, chrome, digital',
  nature: 'nature style, organic, wooden, stone, natural materials',
  dark: 'dark style, sinister, corrupted, shadow, evil',
  holy: 'holy style, divine, radiant, blessed, sacred',
  custom: '',
};

const ITEM_ORIENTATION_PROMPTS: Record<string, string> = {
  vertical: 'vertical orientation, upright position, blade pointing up',
  horizontal: 'horizontal orientation, lying flat, side view',
  diagonal: '45 degree angle, diagonal orientation, dynamic pose',
};

export function buildItemPrompt(
  description: string,
  options: ItemPromptOptions = {}
): PromptResult {
  const {
    category = 'custom',
    size = 'medium',
    theme = 'fantasy',
    orientation = 'vertical',
    palette = 'default',
    pixelStyle = '16-bit',
    iconSize = 32,
  } = options;

  // Sanitize user input - remove messy effect words
  const sanitizedDesc = sanitizeInput(
    description,
    [...UNIVERSAL_BANNED_WORDS, ...ITEM_BANNED_WORDS]
  );

  const parts: string[] = [];

  // Core item instructions
  parts.push('pixel art game item');
  parts.push('game inventory icon');
  parts.push('single object');
  parts.push('centered in frame');
  parts.push('clean pixel edges');

  // Orientation
  parts.push(ITEM_ORIENTATION_PROMPTS[orientation]);

  // Size description
  parts.push(ITEM_SIZE_PROMPTS[size]);

  // Category
  if (category !== 'custom') {
    parts.push(ITEM_CATEGORY_PROMPTS[category]);
  }

  // Theme
  if (theme !== 'custom') {
    parts.push(ITEM_THEME_PROMPTS[theme]);
  }

  // User description
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // Visual clarity
  parts.push('clear silhouette');
  parts.push('distinct outline');
  parts.push('readable at small size');
  parts.push('transparent background');

  // Pixel style
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // Palette
  if (palette !== 'default') {
    parts.push(PALETTE_PROMPTS[palette]);
  }

  // Size hint
  parts.push(`${iconSize}x${iconSize} icon`);

  // Quality markers
  parts.push('clean pixel art');
  parts.push('game asset quality');

  // Build negative prompt - block all messy effects
  const negativePrompt = [
    'tilted',
    'rotated at odd angle',
    'multiple items',
    'hands holding',
    'arm holding',
    'person holding',
    'particles',
    'floating particles',
    'blood drips',
    'dripping liquid',
    'smoke',
    'mist',
    'fog',
    'wisps',
    'aura',
    'glow effect',
    'sparkles',
    'blur',
    'motion blur',
    'background elements',
    'ground',
    'shadow on ground',
    'complex background',
    'blurry',
    'anti-aliased edges',
    'soft edges',
    '3d render',
    'photograph',
    'realistic',
  ].join(', ');

  return {
    prompt: parts.filter(Boolean).join(', '),
    negativePrompt,
    style: category === 'weapon' ? 'skill_icon' : 'topdown_item',
  };
}

// ==========================================
// 3. BACKGROUND PROMPT BUILDER
// ==========================================

export type BackgroundType =
  | 'side-scroller'
  | 'top-down'
  | 'parallax-sky'
  | 'parallax-far'
  | 'parallax-mid'
  | 'parallax-near'
  | 'parallax-ground';

export type EnvironmentTheme =
  | 'forest'
  | 'dungeon'
  | 'castle'
  | 'city'
  | 'desert'
  | 'snow'
  | 'underwater'
  | 'space'
  | 'cave'
  | 'village'
  | 'battlefield'
  | 'sky'
  | 'volcano'
  | 'swamp'
  | 'cyberpunk-city'
  | 'ancient-ruins'
  | 'custom';

export interface BackgroundPromptOptions {
  backgroundType?: BackgroundType;
  theme?: EnvironmentTheme;
  palette?: ColorPalette;
  pixelStyle?: PixelStyle;
  seamless?: boolean;
  width?: number;
  height?: number;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
}

const BACKGROUND_TYPE_PROMPTS: Record<BackgroundType, string> = {
  'side-scroller': 'side-scrolling game background, horizontal layers, platform game style',
  'top-down': 'top-down game background, overhead view, RPG map style',
  'parallax-sky': 'far background layer, sky only, clouds, sun or moon, atmospheric, seamless horizontal',
  'parallax-far': 'distant background layer, mountain silhouettes, far buildings, low detail, atmospheric haze',
  'parallax-mid': 'middle distance layer, trees, structures, medium detail, some transparency',
  'parallax-near': 'foreground layer, detailed foliage, near objects, high detail, mostly transparent',
  'parallax-ground': 'ground layer, walking surface, platform tiles, solid ground',
};

const ENVIRONMENT_THEME_PROMPTS: Record<EnvironmentTheme, string> = {
  forest: 'lush forest, trees, foliage, nature, woodland, green vegetation',
  dungeon: 'dark dungeon, stone walls, torches, underground, mysterious shadows',
  castle: 'medieval castle, stone architecture, towers, gothic style, fortress',
  city: 'urban cityscape, buildings, streets, rooftops, metropolitan',
  desert: 'arid desert, sand dunes, cacti, sun-scorched, dry terrain',
  snow: 'winter wonderland, snow-covered, ice crystals, frozen landscape, cold atmosphere',
  underwater: 'ocean depths, coral reefs, bubbles, fish silhouettes, aquatic blue',
  space: 'cosmic scene, stars, nebulae, planets, asteroids, space environment',
  cave: 'rocky cave, stalactites, crystals, underground cavern, dark with light shafts',
  village: 'peaceful village, cottages, rural, farmland, quaint buildings',
  battlefield: 'war-torn battlefield, destruction, dramatic sky, conflict zone',
  sky: 'floating islands, clouds, heavenly, aerial landscape, sky kingdom',
  volcano: 'volcanic landscape, lava flows, ash clouds, molten rock, fiery',
  swamp: 'murky swamp, dead trees, fog, lily pads, eerie green water',
  'cyberpunk-city': 'neon cyberpunk city, holographic signs, rain, flying cars, dystopian',
  'ancient-ruins': 'ancient ruins, crumbling pillars, overgrown vegetation, mysterious artifacts',
  custom: '',
};

const TIME_OF_DAY_PROMPTS: Record<string, string> = {
  day: 'bright daylight, blue sky, sunny, warm lighting',
  night: 'nighttime, dark sky, stars, moon, cool blue lighting',
  dawn: 'dawn, sunrise, orange pink sky, warm golden light, morning mist',
  dusk: 'dusk, sunset, purple orange sky, long shadows, evening atmosphere',
};

export function buildBackgroundPrompt(
  description: string,
  options: BackgroundPromptOptions = {}
): PromptResult {
  const {
    backgroundType = 'side-scroller',
    theme = 'forest',
    palette = 'default',
    pixelStyle = '16-bit',
    seamless = true,
    width = 256,
    height = 128,
    timeOfDay = 'day',
  } = options;

  // Sanitize user input
  const sanitizedDesc = sanitizeInput(
    description,
    [...UNIVERSAL_BANNED_WORDS, ...BACKGROUND_BANNED_WORDS]
  );

  const parts: string[] = [];

  // Core background instructions - ENFORCE FLAT COMPOSITION
  parts.push('pixel art game background');
  parts.push('2D game background');
  parts.push('flat horizontal composition');
  parts.push('no perspective');
  parts.push('no vanishing point');
  parts.push('side view');

  // Background type
  parts.push(BACKGROUND_TYPE_PROMPTS[backgroundType]);

  // Parallax-ready for side-scrollers
  if (backgroundType === 'side-scroller' || backgroundType.startsWith('parallax')) {
    parts.push('parallax-ready');
    parts.push('horizontal layers');
  }

  // Environment theme
  if (theme !== 'custom') {
    parts.push(ENVIRONMENT_THEME_PROMPTS[theme]);
  }

  // Time of day
  parts.push(TIME_OF_DAY_PROMPTS[timeOfDay]);

  // User description
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // Seamless tiling
  if (seamless) {
    parts.push('seamless horizontal tile');
    parts.push('tileable');
    parts.push('repeating edges');
  }

  // Visual style
  parts.push('simple shapes');
  parts.push('clean edges');
  parts.push('limited color palette');

  // Pixel style
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // Palette
  if (palette !== 'default') {
    parts.push(PALETTE_PROMPTS[palette]);
  }

  // Dimensions
  parts.push(`${width}x${height} pixels`);

  // Quality markers
  parts.push('clean pixel art');
  parts.push('game asset quality');
  parts.push('no characters');
  parts.push('environment only');

  // Build negative prompt - block perspective and 3D
  const negativePrompt = [
    'perspective',
    'vanishing point',
    '3D depth',
    'fisheye',
    'tilted',
    'angled',
    'diagonal composition',
    'portrait orientation',
    'close-up',
    'zoom',
    'first person view',
    'character',
    'person',
    'creature',
    'blurry',
    'anti-aliased',
    'photograph',
    'realistic',
    '3d render',
    'complex lighting',
  ].join(', ');

  // Determine best style
  let style = 'environment';
  if (backgroundType === 'top-down') {
    style = 'topdown_map';
  } else if (backgroundType === 'parallax-ground') {
    style = 'topdown_asset';
  }

  return {
    prompt: parts.filter(Boolean).join(', '),
    negativePrompt,
    style,
  };
}

// ==========================================
// 4. CHARACTER PROMPT BUILDER (Enhanced)
// ==========================================

export type CharacterPose =
  | 'idle_front'
  | 'idle_side'
  | 'idle_back'
  | 'walk_1'
  | 'walk_2'
  | 'run_1'
  | 'run_2'
  | 'attack_windup'
  | 'attack_swing'
  | 'attack_recover'
  | 'jump_up'
  | 'jump_peak'
  | 'jump_fall'
  | 'crouch'
  | 'hurt'
  | 'death'
  | 'custom';

export type CharacterView = 'front' | 'side' | 'back' | 'three-quarter';

export type CharacterType =
  | 'humanoid'
  | 'animal'
  | 'monster'
  | 'robot'
  | 'fantasy-creature'
  | 'chibi'
  | 'custom';

export interface CharacterPromptOptions {
  pose?: CharacterPose;
  view?: CharacterView;
  characterType?: CharacterType;
  palette?: ColorPalette;
  pixelStyle?: PixelStyle;
  size?: number;
  animationReady?: boolean;
  accentColors?: string[];
}

const CHARACTER_POSE_PROMPTS: Record<CharacterPose, string> = {
  idle_front: 'standing idle pose, front facing, arms at sides, neutral stance, relaxed',
  idle_side: 'standing idle pose, side profile, arms at sides, neutral stance',
  idle_back: 'standing idle pose, back facing, showing back of character',
  walk_1: 'walking pose frame 1, left foot forward, mid-stride, arms swinging',
  walk_2: 'walking pose frame 2, right foot forward, opposite arm forward',
  run_1: 'running pose frame 1, dynamic stride, arms pumping, leaning forward',
  run_2: 'running pose frame 2, airborne moment, legs extended',
  attack_windup: 'attack windup pose, weapon raised, preparing to strike',
  attack_swing: 'attack swing pose, mid-strike, weapon in motion, dynamic',
  attack_recover: 'attack recovery pose, follow-through, returning to stance',
  jump_up: 'jump ascending pose, legs bent, arms up, rising',
  jump_peak: 'jump peak pose, at highest point, arms spread',
  jump_fall: 'jump falling pose, descending, legs preparing to land',
  crouch: 'crouching pose, knees bent, low stance, ready position',
  hurt: 'hurt pose, recoiling, pain reaction, knocked back',
  death: 'death pose, fallen, defeated, lying down',
  custom: '',
};

const CHARACTER_VIEW_PROMPTS: Record<CharacterView, string> = {
  front: 'front facing view, looking at camera, symmetrical',
  side: 'side profile view, 90 degree angle, clear silhouette',
  back: 'back view, facing away, showing back details',
  'three-quarter': 'three-quarter view, 45 degree angle, dynamic perspective',
};

const CHARACTER_TYPE_PROMPTS: Record<CharacterType, string> = {
  humanoid: 'humanoid character, human proportions, bipedal',
  animal: 'animal character, creature, beast',
  monster: 'monster character, creature, enemy, hostile appearance',
  robot: 'robot character, mechanical, android, machine',
  'fantasy-creature': 'fantasy creature, mythical being, magical entity',
  chibi: 'chibi style, super deformed, big head, small body, cute proportions',
  custom: '',
};

export function buildCharacterPrompt(
  description: string,
  options: CharacterPromptOptions = {}
): PromptResult {
  const {
    pose = 'idle_front',
    view = 'front',
    characterType = 'humanoid',
    palette = 'default',
    pixelStyle = '16-bit',
    size = 64,
    animationReady = false,
    accentColors = [],
  } = options;

  // Sanitize user input
  const sanitizedDesc = sanitizeInput(description, UNIVERSAL_BANNED_WORDS);

  const parts: string[] = [];

  // Core character instructions - CRITICAL for proper framing
  parts.push('pixel art game sprite');
  parts.push('full body visible');
  parts.push('head to toe');
  parts.push('complete character');
  parts.push('centered in frame');
  parts.push('padding around character');

  // Silhouette clarity - CRITICAL for readability
  parts.push('clear silhouette');
  parts.push('distinct outline');
  parts.push('readable at small size');
  parts.push('high contrast');

  // View
  parts.push(CHARACTER_VIEW_PROMPTS[view]);

  // Character type
  if (characterType !== 'custom') {
    parts.push(CHARACTER_TYPE_PROMPTS[characterType]);
  }

  // User description
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // Pose
  if (pose !== 'custom') {
    parts.push(CHARACTER_POSE_PROMPTS[pose]);
  }

  // Accent colors for visual separation
  if (accentColors.length > 0) {
    parts.push(`accent colors: ${accentColors.join(', ')}`);
  }

  // Animation-ready constraints
  if (animationReady) {
    parts.push('consistent proportions');
    parts.push('suitable for sprite sheet');
    parts.push('animation frame');
    parts.push('clean edges for animation');
  }

  // Pixel style
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // Palette
  if (palette !== 'default') {
    parts.push(PALETTE_PROMPTS[palette]);
  }

  // Size
  parts.push(`${size}x${size} sprite`);

  // Quality markers
  parts.push('clean pixel art');
  parts.push('game character sprite');
  parts.push('transparent background');

  // Build negative prompt
  const negativePrompt = [
    'cropped',
    'cut off',
    'partial body',
    'missing limbs',
    'missing feet',
    'missing head',
    'blurry',
    'muddy colors',
    'anti-aliased',
    'smooth edges',
    'out of frame',
    'off-center',
    'tilted',
    'background elements',
    'complex background',
    'scenery',
    'multiple characters',
    'duplicated',
    '3d render',
    'photograph',
    'realistic',
  ].join(', ');

  // Determine best style
  let style = 'default';
  if (animationReady) {
    style = 'default'; // Standard style works best for animation frames
  } else if (characterType === 'chibi') {
    style = 'cartoon';
  }

  return {
    prompt: parts.filter(Boolean).join(', '),
    negativePrompt,
    style,
  };
}

// ==========================================
// UTILITY: Get recommended Retro Diffusion style
// ==========================================

export function getRecommendedStyle(
  category: 'tile' | 'item' | 'background' | 'character',
  subcategory?: string
): string {
  const styleMap: Record<string, Record<string, string>> = {
    tile: {
      default: 'topdown_asset',
      isometric: 'isometric_asset',
      side: 'default',
    },
    item: {
      weapon: 'skill_icon',
      default: 'topdown_item',
      icon: 'skill_icon',
    },
    background: {
      'side-scroller': 'environment',
      'top-down': 'topdown_map',
      default: 'environment',
    },
    character: {
      default: 'default',
      turnaround: 'character_turnaround',
      chibi: 'cartoon',
    },
  };

  return styleMap[category]?.[subcategory || 'default'] || 'default';
}

// ==========================================
// EXPORT ALL BUILDERS
// ==========================================

export const PromptBuilders = {
  tile: buildTilePrompt,
  item: buildItemPrompt,
  background: buildBackgroundPrompt,
  character: buildCharacterPrompt,
  getRecommendedStyle,
};

export default PromptBuilders;
