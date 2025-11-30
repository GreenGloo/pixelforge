// ==========================================
// Background/Scene Prompt Builder
// Generates flat, layer-friendly backgrounds for 2D games
// ==========================================

import {
  EnvironmentType,
  BackgroundView,
  TimeOfDay,
  BackgroundPromptOptions,
  PromptResult,
  PIXEL_STYLE_PROMPTS,
} from './types';
import { sanitizeBackgroundInput, getNegativeBase } from './sanitizer';

// ==========================================
// VIEW/LAYER TYPE DESCRIPTIONS
// ==========================================

const VIEW_PROMPTS: Record<BackgroundView, string> = {
  'side-scroll':
    'side-scrolling game background, horizontal composition, flat side view, no floor perspective, platformer style',
  'top-down':
    'top-down game background, overhead view, flat top-down perspective, no horizon, RPG map style',
  'parallax-sky':
    'distant sky layer, far background, clouds, atmospheric elements, sky and celestial, seamless horizontal',
  'parallax-mid':
    'middle ground layer, medium distance elements, trees or buildings, some transparency at edges',
  'parallax-fore':
    'foreground layer, close elements, ground details, high detail, mostly transparent base',
};

// ==========================================
// ENVIRONMENT TYPE DESCRIPTIONS
// ==========================================

const ENVIRONMENT_PROMPTS: Record<EnvironmentType, string> = {
  dungeon:
    'dark dungeon interior, stone corridors, torches on walls, underground atmosphere',
  forest:
    'lush forest, trees, natural foliage, woodland environment, green vegetation',
  city: 'urban cityscape, buildings, streets, rooftops, metropolitan area',
  village:
    'peaceful village, cottages, rural setting, farmland, quaint buildings',
  castle:
    'medieval castle, stone architecture, towers and battlements, gothic fortress',
  cave: 'rocky cavern, stalactites, underground cave, crystals, dark with light shafts',
  desert:
    'arid desert, sand dunes, cacti, sun-scorched terrain, dry landscape',
  snow: 'winter landscape, snow-covered ground, ice crystals, frozen environment, cold atmosphere',
  ocean: 'ocean scene, sea surface, beach, waves, coastal environment',
  underwater:
    'underwater scene, coral reefs, bubbles, fish silhouettes, deep blue aquatic',
  sky: 'sky realm, floating islands, clouds, heavenly atmosphere, aerial landscape',
  space:
    'cosmic space, stars, nebulae, planets, asteroids, dark void with celestial bodies',
  spaceship:
    'spaceship interior, sci-fi corridor, metal walls, control panels, glowing screens',
  cyberpunk:
    'neon cyberpunk city, holographic signs, rain-slicked streets, flying vehicles, dystopian',
  industrial:
    'industrial setting, factory machinery, pipes, gears, steam, utilitarian',
  ruins:
    'ancient ruins, crumbling pillars, overgrown vegetation, mysterious atmosphere',
  graveyard:
    'spooky graveyard, tombstones, dead trees, fog, eerie atmosphere, moonlit',
  swamp: 'murky swamp, dead trees, lily pads, fog, greenish water, wetland',
  volcano:
    'volcanic landscape, lava flows, ash clouds, molten rock, fiery atmosphere',
  library:
    'grand library, bookshelves, reading areas, magical tomes, scholarly atmosphere',
  temple:
    'sacred temple, mystical architecture, religious symbols, divine atmosphere',
  arena:
    'combat arena, colosseum style, battle area, spectator stands, gladiatorial',
  custom: '',
};

// ==========================================
// TIME OF DAY DESCRIPTIONS
// ==========================================

const TIME_OF_DAY_PROMPTS: Record<TimeOfDay, string> = {
  day: 'bright daylight, blue sky, sunny atmosphere, warm natural lighting',
  sunset:
    'sunset, orange and pink sky, golden hour, long shadows, warm evening light',
  night:
    'nighttime, dark sky, stars visible, moonlight, cool blue ambient light',
  dawn: 'dawn, sunrise, soft orange pink sky, morning mist, gentle awakening light',
  stormy:
    'stormy weather, dark clouds, lightning, rain, dramatic atmosphere, ominous',
};

// ==========================================
// MOOD DESCRIPTIONS
// ==========================================

const MOOD_PROMPTS: Record<string, string> = {
  peaceful: 'peaceful, calm, serene, tranquil atmosphere',
  ominous: 'ominous, foreboding, threatening, dark presence',
  mysterious: 'mysterious, enigmatic, secrets, hidden depths',
  magical: 'magical, enchanted, wonder, fantasy atmosphere',
  dangerous: 'dangerous, perilous, hazardous environment',
  abandoned: 'abandoned, desolate, empty, forgotten place',
  lively: 'lively, bustling, active, full of life',
  ancient: 'ancient, timeless, historical, aged atmosphere',
  futuristic: 'futuristic, advanced, high-tech, modern',
  haunted: 'haunted, ghostly, supernatural, eerie presence',
};

// ==========================================
// MAIN BUILDER FUNCTION
// ==========================================

export function buildBackgroundPrompt(
  description: string,
  options: BackgroundPromptOptions = {}
): PromptResult {
  const {
    environment = 'forest',
    view = 'side-scroll',
    timeOfDay = 'day',
    mood,
    colors,
    details,
    pixelStyle = '16-bit',
    includeCharacters = false,
    seamless = true,
    width = 256,
    height = 128,
  } = options;

  // Sanitize user input - remove perspective-breaking words
  const sanitizedDesc = sanitizeBackgroundInput(description || '');
  const sanitizedDetails = details ? sanitizeBackgroundInput(details) : '';

  const parts: string[] = [];

  // ==========================================
  // 1. CORE BACKGROUND INSTRUCTIONS (Critical for flat composition)
  // ==========================================
  parts.push('pixel art game background');
  parts.push('2D game background');
  parts.push('flat composition');
  parts.push('no 3D perspective');
  parts.push('no vanishing point');

  // ==========================================
  // 2. VIEW TYPE (Critical for correct layer)
  // ==========================================
  parts.push(VIEW_PROMPTS[view]);

  // ==========================================
  // 3. ENVIRONMENT TYPE
  // ==========================================
  if (environment !== 'custom' && ENVIRONMENT_PROMPTS[environment]) {
    parts.push(ENVIRONMENT_PROMPTS[environment]);
  }

  // ==========================================
  // 4. TIME OF DAY
  // ==========================================
  parts.push(TIME_OF_DAY_PROMPTS[timeOfDay]);

  // ==========================================
  // 5. MOOD (if specified)
  // ==========================================
  if (mood && MOOD_PROMPTS[mood.toLowerCase()]) {
    parts.push(MOOD_PROMPTS[mood.toLowerCase()]);
  } else if (mood) {
    parts.push(`${sanitizeBackgroundInput(mood)} atmosphere`);
  }

  // ==========================================
  // 6. USER DESCRIPTION (sanitized)
  // ==========================================
  if (sanitizedDesc) {
    parts.push(sanitizedDesc);
  }

  // ==========================================
  // 7. CUSTOM DETAILS (sanitized)
  // ==========================================
  if (sanitizedDetails) {
    parts.push(sanitizedDetails);
  }

  // ==========================================
  // 8. COLOR SPECIFICATION
  // ==========================================
  if (colors) {
    parts.push(`color palette: ${colors}`);
  }

  // ==========================================
  // 9. SEAMLESS TILING (for parallax)
  // ==========================================
  if (seamless) {
    parts.push('seamless horizontal tile');
    parts.push('tileable left-right');
    parts.push('continuous edges');
  }

  // ==========================================
  // 10. VISUAL STYLE
  // ==========================================
  parts.push('clean edges');
  parts.push('simple shapes');
  parts.push('limited color palette');
  parts.push('game environment art');

  // ==========================================
  // 11. PIXEL STYLE
  // ==========================================
  parts.push(PIXEL_STYLE_PROMPTS[pixelStyle]);

  // ==========================================
  // 12. DIMENSIONS
  // ==========================================
  parts.push(`${width}x${height} pixels`);

  // ==========================================
  // 13. CHARACTER EXCLUSION (default)
  // ==========================================
  if (!includeCharacters) {
    parts.push('no characters');
    parts.push('no people');
    parts.push('environment only');
  }

  // ==========================================
  // 14. QUALITY MARKERS
  // ==========================================
  parts.push('clean pixel art');
  parts.push('game asset quality');

  // ==========================================
  // BUILD NEGATIVE PROMPT
  // ==========================================
  let negativePrompt = getNegativeBase('background');

  // Add character exclusion to negative if not wanted
  if (!includeCharacters) {
    negativePrompt += ', characters, people, figures, creatures, NPCs';
  }

  // ==========================================
  // DETERMINE BEST RETRO DIFFUSION STYLE
  // Valid RD styles: topdown_asset, topdown_item, skill_icon, environment, isometric_asset
  // ==========================================
  let style = 'environment';
  if (view === 'top-down') {
    style = 'topdown_asset'; // topdown_map doesn't exist in RD
  } else if (view === 'parallax-fore') {
    style = 'topdown_asset';
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

export const quickBackground = {
  /** Basic environment */
  basic: (environment: EnvironmentType) =>
    buildBackgroundPrompt('', { environment }),

  /** Side-scrolling background */
  sideScroll: (environment: EnvironmentType, timeOfDay: TimeOfDay = 'day') =>
    buildBackgroundPrompt('', { environment, view: 'side-scroll', timeOfDay }),

  /** Top-down RPG map */
  topDown: (environment: EnvironmentType) =>
    buildBackgroundPrompt('', { environment, view: 'top-down' }),

  /** Parallax sky layer */
  skyLayer: (timeOfDay: TimeOfDay = 'day') =>
    buildBackgroundPrompt('sky with clouds', {
      environment: 'sky',
      view: 'parallax-sky',
      timeOfDay,
    }),

  /** Parallax midground */
  midLayer: (environment: EnvironmentType) =>
    buildBackgroundPrompt('', { environment, view: 'parallax-mid' }),

  /** Parallax foreground */
  foreLayer: (environment: EnvironmentType) =>
    buildBackgroundPrompt('', { environment, view: 'parallax-fore' }),

  /** Forest side-scroller */
  forest: (timeOfDay: TimeOfDay = 'day') =>
    buildBackgroundPrompt('lush trees and vegetation', {
      environment: 'forest',
      view: 'side-scroll',
      timeOfDay,
      mood: 'peaceful',
    }),

  /** Dungeon interior */
  dungeon: () =>
    buildBackgroundPrompt('dark stone corridors with torches', {
      environment: 'dungeon',
      view: 'side-scroll',
      timeOfDay: 'night',
      mood: 'ominous',
    }),

  /** Cyberpunk city */
  cyberpunk: () =>
    buildBackgroundPrompt('neon signs and holographic advertisements', {
      environment: 'cyberpunk',
      view: 'side-scroll',
      timeOfDay: 'night',
      colors: 'neon pink, cyan, purple',
    }),

  /** Space scene */
  space: () =>
    buildBackgroundPrompt('stars and distant planets', {
      environment: 'space',
      view: 'parallax-sky',
      timeOfDay: 'night',
    }),

  /** Spaceship interior */
  spaceship: () =>
    buildBackgroundPrompt('metal corridors with control panels', {
      environment: 'spaceship',
      view: 'side-scroll',
      mood: 'futuristic',
    }),

  /** Castle interior */
  castle: () =>
    buildBackgroundPrompt('grand halls with stone pillars', {
      environment: 'castle',
      view: 'side-scroll',
      mood: 'ancient',
    }),

  /** Desert landscape */
  desert: (timeOfDay: TimeOfDay = 'day') =>
    buildBackgroundPrompt('sand dunes and cacti', {
      environment: 'desert',
      view: 'side-scroll',
      timeOfDay,
    }),

  /** Snow/winter scene */
  snow: () =>
    buildBackgroundPrompt('snow-covered trees and frozen ground', {
      environment: 'snow',
      view: 'side-scroll',
      mood: 'peaceful',
    }),

  /** Underwater */
  underwater: () =>
    buildBackgroundPrompt('coral and bubbles', {
      environment: 'underwater',
      view: 'side-scroll',
      colors: 'deep blue, turquoise, purple',
    }),
};

export default buildBackgroundPrompt;
