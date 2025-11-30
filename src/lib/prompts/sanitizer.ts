// ==========================================
// Input Sanitization Utilities
// Removes problematic words that break generation quality
// ==========================================

// Words that break ALL generation types
export const UNIVERSAL_BANNED = [
  'realistic',
  'photorealistic',
  'photograph',
  'photo',
  '3d render',
  '3d model',
  'blender',
  'unreal engine',
  'octane',
  'ray tracing',
  'hyperrealistic',
  'real life',
  'lifelike',
  'high definition',
  'hd photo',
  '4k photo',
  '8k photo',
  'dslr',
  'cinema 4d',
  'vray',
  'cgi',
];

// Words that break item/icon generation (create messy effects)
export const ITEM_BANNED = [
  // Particle effects
  'wisps',
  'wisp',
  'smoke',
  'smoking',
  'particles',
  'particle',
  'sparks',
  'spark',
  'embers',
  'ember',
  // Liquid effects
  'dripping',
  'drips',
  'drip',
  'splash',
  'splatter',
  'blood drip',
  'blood splatter',
  'liquid dripping',
  'oozing',
  'ooze',
  // Floating/aura effects
  'floating',
  'floating elements',
  'aura',
  'magic aura',
  'mist',
  'misty',
  'fog',
  'foggy',
  'haze',
  'haziness',
  // Sparkle effects
  'sparkles',
  'sparkling',
  'glitter',
  'glittering',
  'shimmer',
  'shimmering',
  // Light effects
  'glow effect',
  'glowing particles',
  'lens flare',
  'light rays',
  'god rays',
  'bloom',
  'light bloom',
  // Ghost effects
  'ethereal',
  'ghostly',
  'translucent',
  'transparent effect',
  // Blur effects
  'blur',
  'blurry',
  'motion blur',
  'depth blur',
  // Explosion effects
  'explosion',
  'burst',
  'trail',
  'trailing',
  'magic circles',
];

// Words that break tile seamlessness
export const TILE_BANNED = [
  // Singularity words
  'unique',
  'special',
  'centered object',
  'focal point',
  'single',
  'one',
  'main',
  'hero',
  'primary',
  // Subject words
  'character',
  'person',
  'creature',
  'monster',
  'animal',
  'figure',
  'subject',
  // Lighting issues
  'dramatic lighting',
  'spotlight',
  'directional light',
  'strong shadows',
  'harsh shadows',
  'dramatic shadows',
  // Composition issues
  'centered',
  'main subject',
  'hero shot',
  'portrait',
  'close-up',
];

// Words that break background flat composition
export const BACKGROUND_BANNED = [
  // 3D/Perspective words
  '3d',
  '3-d',
  'three dimensional',
  'depth',
  'depth of field',
  'perspective',
  'vanishing point',
  'horizon line',
  // Angle issues
  'fisheye',
  'wide angle',
  'tilted',
  'angled',
  'diagonal',
  'dutch angle',
  'dramatic angle',
  // View issues
  'portrait',
  'close-up',
  'zoom',
  'zoomed',
  'first person',
  'pov',
  'first-person',
  'point of view',
  // Style conflicts
  'realistic',
  'photorealistic',
  'photograph',
];

// Negative prompts per category
export const TILE_NEGATIVE_BASE = [
  'border',
  'edge',
  'seam visible',
  'non-repeating',
  'non-tileable',
  'single object centered',
  'focal point',
  'unique element',
  'perspective',
  '3D',
  'depth',
  'vanishing point',
  'character',
  'creature',
  'person',
  'text',
  'watermark',
  'signature',
  'blurry',
  'anti-aliased',
  'smooth gradients',
];

export const ITEM_NEGATIVE_BASE = [
  'multiple items',
  'scattered',
  'duplicates',
  'tilted',
  'rotated at angle',
  'hands holding',
  'arm holding',
  'person holding',
  'character',
  'person',
  'background scene',
  'complex background',
  'scenery',
  'particles',
  'floating elements',
  'smoke',
  'wisps',
  'blood drips',
  'liquid dripping',
  'splatter',
  'aura effects',
  'magic circles',
  'sparkles',
  'lens flare',
  'blur',
  'motion blur',
  'blurry',
  'low quality',
  'text',
  'watermark',
  'realistic',
  'photograph',
  '3D render',
];

export const BACKGROUND_NEGATIVE_BASE = [
  'perspective',
  'vanishing point',
  '3D depth',
  'fisheye',
  'tilted',
  'angled view',
  'dutch angle',
  'diagonal composition',
  'portrait orientation',
  'close-up',
  'zoom',
  'first person view',
  'realistic',
  'photograph',
  'photorealistic',
  '3D render',
  'characters',
  'people',
  'figures',
  'text',
  'watermark',
  'signature',
  'UI elements',
  'blurry',
  'low quality',
  'noisy',
];

/**
 * Sanitize input by removing problematic words
 * @param input - User's raw input text
 * @param bannedWords - Array of words to remove
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string, bannedWords: string[]): string {
  if (!input) return '';

  let sanitized = input.toLowerCase();

  // Sort by length descending to match longer phrases first
  const sortedBanned = [...bannedWords].sort((a, b) => b.length - a.length);

  for (const word of sortedBanned) {
    // Match whole words/phrases only
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  // Clean up multiple spaces, commas, and trim
  return sanitized
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get all banned words for a specific category
 */
export function getBannedWords(
  category: 'tile' | 'item' | 'background'
): string[] {
  switch (category) {
    case 'tile':
      return [...UNIVERSAL_BANNED, ...TILE_BANNED];
    case 'item':
      return [...UNIVERSAL_BANNED, ...ITEM_BANNED];
    case 'background':
      return [...UNIVERSAL_BANNED, ...BACKGROUND_BANNED];
    default:
      return UNIVERSAL_BANNED;
  }
}

/**
 * Get base negative prompt for a category
 */
export function getNegativeBase(
  category: 'tile' | 'item' | 'background'
): string {
  switch (category) {
    case 'tile':
      return TILE_NEGATIVE_BASE.join(', ');
    case 'item':
      return ITEM_NEGATIVE_BASE.join(', ');
    case 'background':
      return BACKGROUND_NEGATIVE_BASE.join(', ');
    default:
      return '';
  }
}

/**
 * Sanitize for tiles - removes seamlessness-breaking words
 */
export function sanitizeTileInput(input: string): string {
  return sanitizeInput(input, getBannedWords('tile'));
}

/**
 * Sanitize for items - removes messy effect words
 */
export function sanitizeItemInput(input: string): string {
  return sanitizeInput(input, getBannedWords('item'));
}

/**
 * Sanitize for backgrounds - removes perspective-breaking words
 */
export function sanitizeBackgroundInput(input: string): string {
  return sanitizeInput(input, getBannedWords('background'));
}
