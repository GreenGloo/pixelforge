// ==========================================
// Retro Diffusion via Replicate
// Specialized for pixel art sprite generation and character turnarounds
// Uses retro-diffusion/rd-plus model on Replicate
// ==========================================

import Replicate from 'replicate';

// Retro Diffusion style presets available on rd-plus
export type RetroDiffusionStyle =
  | 'default'
  | 'retro'
  | 'watercolor'
  | 'textured'
  | 'cartoon'
  | 'ui_element'
  | 'item_sheet'
  | 'character_turnaround'  // Character sprites from different angles
  | 'environment'
  | 'isometric'
  | 'isometric_asset'
  | 'topdown_map'
  | 'topdown_asset'
  | 'classic'
  | 'topdown_item'
  | 'low_res'
  | 'mc_item'
  | 'mc_texture'
  | 'skill_icon';

// Standard sprite sizes for game assets
export type SpriteSize = 16 | 32 | 48 | 64 | 96 | 128;

// Pose presets for consistent character sprites
export type PosePreset =
  | 'idle_front'
  | 'idle_side'
  | 'walk_cycle'
  | 'run_cycle'
  | 'attack_melee'
  | 'attack_ranged'
  | 'jump'
  | 'crouch'
  | 'death'
  | 'hurt';

// Color palette presets
export type ColorPalette =
  | 'default'       // No restriction
  | 'gameboy'       // 4 colors: green shades
  | 'nes'           // NES palette
  | 'snes'          // SNES palette
  | 'pico8'         // PICO-8 16 colors
  | 'endesga32'     // Popular 32 color palette
  | 'fantasy'       // Warm fantasy colors
  | 'cyberpunk'     // Neon/dark colors
  | 'nature'        // Greens and browns
  | 'monochrome';   // Single hue variations

// Background layer types for parallax-ready generation
export type BackgroundLayer =
  | 'sky'           // Far background: sky, clouds, sun/moon
  | 'far'           // Distant elements: mountains, buildings
  | 'midground'     // Middle layer: trees, structures
  | 'foreground'    // Near elements: foliage, ground details
  | 'ground';       // Walking surface

// Background theme presets
export type BackgroundTheme =
  | 'forest'        // Trees, nature, outdoor
  | 'dungeon'       // Dark, stone, underground
  | 'castle'        // Medieval architecture
  | 'city'          // Urban environment
  | 'desert'        // Sand, dunes, arid
  | 'snow'          // Winter, ice, cold
  | 'underwater'    // Ocean, bubbles, coral
  | 'space'         // Stars, planets, cosmic
  | 'cave'          // Rocky, dark, crystals
  | 'village'       // Rural, cottages, peaceful
  | 'battlefield'   // War-torn, dramatic
  | 'sky'           // Clouds, floating islands
  | 'custom';       // User-defined

// Palette color definitions for prompt engineering
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

// Pose descriptions for consistent framing
const POSE_PROMPTS: Record<PosePreset, string> = {
  idle_front: 'standing idle pose, front facing view, arms at sides, neutral stance, full body visible',
  idle_side: 'standing idle pose, side profile view, arms at sides, full body visible',
  walk_cycle: 'walking pose, mid-stride, one foot forward, full body visible',
  run_cycle: 'running pose, dynamic movement, arms pumping, full body visible',
  attack_melee: 'melee attack pose, weapon raised, dynamic action pose, full body visible',
  attack_ranged: 'ranged attack pose, aiming stance, bow or gun ready, full body visible',
  jump: 'jumping pose, legs bent, arms up, airborne, full body visible',
  crouch: 'crouching pose, knees bent, low stance, full body visible',
  death: 'fallen pose, lying down, defeated, full body visible',
  hurt: 'hurt pose, recoiling, pain reaction, full body visible',
};

// Background theme descriptions for consistent environments
const THEME_PROMPTS: Record<BackgroundTheme, string> = {
  forest: 'lush forest environment, trees, foliage, nature, outdoor woodland',
  dungeon: 'dark dungeon interior, stone walls, torches, underground, mysterious',
  castle: 'medieval castle architecture, stone walls, towers, gothic style',
  city: 'urban cityscape, buildings, streets, modern or fantasy city',
  desert: 'arid desert landscape, sand dunes, cacti, sun-scorched terrain',
  snow: 'winter wonderland, snow-covered, ice, cold atmosphere, frozen',
  underwater: 'ocean depths, coral reefs, bubbles, aquatic environment',
  space: 'cosmic scene, stars, nebulae, planets, space environment',
  cave: 'rocky cave interior, stalactites, crystals, underground cavern',
  village: 'peaceful village scene, cottages, rural, quaint buildings',
  battlefield: 'war-torn battlefield, dramatic, destruction, conflict zone',
  sky: 'floating sky islands, clouds, heavenly, aerial landscape',
  custom: '',
};

// Layer-specific prompts for parallax backgrounds
const LAYER_PROMPTS: Record<BackgroundLayer, string> = {
  sky: 'far background layer, sky only, clouds, sun or moon, atmospheric, no ground elements, seamless horizontal tile',
  far: 'distant background layer, silhouette mountains or buildings, low detail, atmospheric perspective, seamless horizontal tile',
  midground: 'middle distance layer, trees or structures, medium detail, partially transparent areas for layering, seamless horizontal tile',
  foreground: 'near foreground layer, detailed foliage or objects, high detail, mostly transparent, seamless horizontal tile',
  ground: 'ground layer, walking surface, platform tiles, solid ground texture, seamless horizontal tile',
};

export interface SpriteRotationResult {
  frontUrl: string;
  rightUrl: string;
  backUrl: string;
  leftUrl: string;
}

export interface SpriteGenerationOptions {
  size?: SpriteSize;
  pose?: PosePreset;
  palette?: ColorPalette;
  style?: RetroDiffusionStyle;
  seed?: number;
  removeBackground?: boolean;
}

export interface BackgroundGenerationOptions {
  theme?: BackgroundTheme;
  layer?: BackgroundLayer;
  palette?: ColorPalette;
  width?: number;
  height?: number;
  seed?: number;
  seamless?: boolean;  // Whether to generate seamless/tileable background
}

export interface BackgroundResult {
  imageUrl: string;
  seed: number;
  layer: BackgroundLayer;
  theme: BackgroundTheme;
}

export interface ParallaxBackgroundResult {
  layers: {
    sky?: string;
    far?: string;
    midground?: string;
    foreground?: string;
    ground?: string;
  };
  seed: number;
  theme: BackgroundTheme;
}

/**
 * Build an optimized prompt for game sprite generation
 * Ensures proper framing, full body visibility, and consistent style
 */
function buildSpritePrompt(
  characterDescription: string,
  options: {
    pose?: PosePreset;
    palette?: ColorPalette;
  } = {}
): string {
  const parts: string[] = [];

  // Core framing instructions (always include)
  parts.push('pixel art game sprite');
  parts.push('full body visible');
  parts.push('centered in frame');
  parts.push('clear edges');
  parts.push('padding around character');

  // Character description
  parts.push(characterDescription);

  // Pose instructions
  if (options.pose) {
    parts.push(POSE_PROMPTS[options.pose]);
  }

  // Color palette
  if (options.palette && options.palette !== 'default') {
    parts.push(PALETTE_PROMPTS[options.palette]);
  }

  // Quality markers
  parts.push('clean pixel art');
  parts.push('no cut off');
  parts.push('complete character');

  return parts.join(', ');
}

// Banned words that create problematic outputs in backgrounds
const BACKGROUND_BANNED_WORDS = [
  '3d', 'depth', 'perspective', 'vanishing point', 'fisheye',
  'isometric', 'angle', 'birds eye', 'aerial', 'from above',
  'character', 'person', 'figure', 'npc', 'enemy', 'player',
  'boss', 'monster', 'creature', 'sprite',
];

// Sanitize description by removing banned words
function sanitizeBackgroundDescription(description: string): string {
  let sanitized = description.toLowerCase();
  for (const word of BACKGROUND_BANNED_WORDS) {
    sanitized = sanitized.replace(new RegExp(word, 'gi'), '');
  }
  // Clean up extra spaces/commas
  return sanitized.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
}

/**
 * Build an optimized prompt for game background generation
 * Ensures flat composition, parallax-ready layers, and seamless tiling
 * Now includes negative prompts for better quality control
 */
function buildBackgroundPrompt(
  description: string,
  options: {
    theme?: BackgroundTheme;
    layer?: BackgroundLayer;
    palette?: ColorPalette;
    seamless?: boolean;
  } = {}
): { prompt: string; negativePrompt: string } {
  const parts: string[] = [];

  // Core background instructions - FLAT COMPOSITION IS CRITICAL
  parts.push('pixel art game background');
  parts.push('2D game background layer');
  parts.push('flat horizontal composition');
  parts.push('no perspective');
  parts.push('side-scrolling view');
  parts.push('parallax-ready');
  parts.push('flat 2D scene');
  parts.push('straight horizon line');

  // Theme styling
  if (options.theme && options.theme !== 'custom') {
    parts.push(THEME_PROMPTS[options.theme]);
  }

  // Sanitized user description
  if (description) {
    const sanitized = sanitizeBackgroundDescription(description);
    if (sanitized) {
      parts.push(sanitized);
    }
  }

  // Layer-specific instructions
  if (options.layer) {
    parts.push(LAYER_PROMPTS[options.layer]);
  }

  // Color palette
  if (options.palette && options.palette !== 'default') {
    parts.push(PALETTE_PROMPTS[options.palette]);
  }

  // Seamless tiling
  if (options.seamless !== false) {
    parts.push('seamless horizontal tile');
    parts.push('tileable');
    parts.push('repeating pattern');
  }

  // Quality markers
  parts.push('clean pixel art');
  parts.push('game asset quality');
  parts.push('no characters');
  parts.push('environment only');

  // Comprehensive negative prompt for backgrounds
  const negativePrompt = [
    // Block 3D/perspective
    '3d render', 'depth perspective', 'vanishing point', 'isometric view',
    'birds eye view', 'aerial perspective', 'fisheye', 'camera angle',
    // Block characters
    'character', 'person', 'figure', 'npc', 'creature', 'monster',
    'sprite', 'player', 'enemy', 'boss',
    // Block quality issues
    'blurry', 'smooth', 'anti-aliased', 'gradient',
    'realistic', 'photograph', 'watermark', 'text', 'signature',
    // Block non-pixel styles
    'oil painting', 'watercolor', 'sketch', 'drawing',
    'vector', 'cartoon', 'anime',
  ].join(', ');

  return {
    prompt: parts.join(', '),
    negativePrompt,
  };
}

function getReplicateClient(): Replicate | null {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return null;
  }
  return new Replicate({ auth: apiKey });
}

export function isRetroDiffusionConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

/**
 * Extract base64 data from a data URL or return as-is if already base64
 */
function extractBase64(imageData: string): string {
  if (imageData.startsWith('data:image/')) {
    const base64Part = imageData.split(',')[1];
    return base64Part || imageData;
  }
  return imageData;
}

/**
 * Convert output to a usable URL
 * Replicate's FileOutput objects use toString() to return the URL string
 */
function toImageUrl(output: unknown): string {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') {
      return first;
    }
    // Replicate FileOutput objects implement toString() that returns the URL
    if (first && typeof first === 'object') {
      const str = String(first);
      if (str.startsWith('http')) {
        console.log('Got image URL:', str);
        return str;
      }
    }
  }
  // Handle single FileOutput object
  if (output && typeof output === 'object') {
    const str = String(output);
    if (str.startsWith('http')) {
      console.log('Got image URL:', str);
      return str;
    }
  }

  console.error('Unexpected output format:', typeof output, output);
  throw new Error('Unexpected output format from Replicate');
}

/**
 * Generate pixel art using Retro Diffusion on Replicate
 * Now supports negative_prompt for better quality control
 */
async function generateWithRetroDiffusion(params: {
  prompt: string;
  negativePrompt?: string;
  style?: RetroDiffusionStyle;
  width?: number;
  height?: number;
  inputImage?: string;
  strength?: number;
  removeBackground?: boolean;
  seed?: number;
}): Promise<string> {
  const replicate = getReplicateClient();
  if (!replicate) {
    throw new Error('Replicate API not configured. Set REPLICATE_API_TOKEN.');
  }

  const {
    prompt,
    negativePrompt,
    style = 'default',
    width = 64,
    height = 64,
    inputImage,
    strength = 0.7,
    removeBackground = true,
    seed,
  } = params;

  const input: Record<string, unknown> = {
    prompt,
    style,
    width,
    height,
    remove_bg: removeBackground,
    num_images: 1,
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }

  if (seed !== undefined) {
    input.seed = seed;
  }

  if (inputImage) {
    // Replicate expects a data URL for input_image
    const base64 = extractBase64(inputImage);
    input.input_image = `data:image/png;base64,${base64}`;
    input.strength = strength;
  }

  console.log('Calling Retro Diffusion on Replicate:', {
    style,
    width,
    height,
    hasInputImage: !!inputImage,
    removeBackground,
    hasNegativePrompt: !!negativePrompt,
  });

  const output = await replicate.run(
    'retro-diffusion/rd-plus' as `${string}/${string}`,
    { input }
  );

  return toImageUrl(output);
}

export interface SpriteRotationsResult {
  rotations: Array<{
    direction: string;
    imageUrl: string;
  }>;
}

/**
 * Generate character rotations by creating 4 separate images with direction-specific prompts
 *
 * The character_turnaround style doesn't respect custom prompts, so we generate
 * 4 individual sprites with the user's description + direction modifiers.
 * Using the same seed ensures visual consistency across rotations.
 */
export async function generateCharacterTurnaround(
  sourceImage: string | null,
  options?: {
    characterDescription?: string;
    width?: number;
    height?: number;
  }
): Promise<SpriteRotationsResult> {
  const description = options?.characterDescription || 'pixel art character sprite';
  const spriteWidth = options?.width || 64;
  const spriteHeight = options?.height || 64;

  console.log('Generating character rotations with Retro Diffusion...');
  console.log('Character description:', description);

  // Use same seed for all rotations to maintain consistency
  const baseSeed = Math.floor(Math.random() * 2147483647);

  // Direction-specific prompts
  const directions = [
    { name: 'front', prompt: `${description}, front view, facing camera, pixel art game sprite, full body visible, centered` },
    { name: 'right', prompt: `${description}, right side view, profile facing right, pixel art game sprite, full body visible, centered` },
    { name: 'back', prompt: `${description}, back view, facing away from camera, pixel art game sprite, full body visible, centered` },
    { name: 'left', prompt: `${description}, left side view, profile facing left, pixel art game sprite, full body visible, centered` },
  ];

  const rotations: Array<{ direction: string; imageUrl: string }> = [];

  // Generate each rotation
  for (let i = 0; i < directions.length; i++) {
    const dir = directions[i];
    console.log(`Generating ${dir.name} view...`);

    try {
      const imageUrl = await generateWithRetroDiffusion({
        prompt: dir.prompt,
        style: 'default',  // Use default style to respect the prompt
        width: spriteWidth,
        height: spriteHeight,
        seed: baseSeed + i,  // Slight seed variation for each angle
        removeBackground: true,
      });

      rotations.push({
        direction: dir.name,
        imageUrl,
      });
      console.log(`${dir.name} view generated successfully`);
    } catch (error) {
      console.error(`Failed to generate ${dir.name} view:`, error);
      throw error;
    }
  }

  return { rotations };
}

/**
 * Generate pixel art sprite using Retro Diffusion
 */
export async function generatePixelArt(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    style?: RetroDiffusionStyle;
    seed?: number;
    removeBackground?: boolean;
  }
): Promise<string> {
  return generateWithRetroDiffusion({
    prompt,
    width: options?.width || 64,
    height: options?.height || 64,
    style: options?.style || 'default',
    seed: options?.seed,
    removeBackground: options?.removeBackground ?? true,
  });
}

/**
 * Generate game-ready sprite with pose presets, palette control, and proper framing
 * This is the main function for consistent game asset generation
 */
export async function generateGameSprite(
  characterDescription: string,
  options: SpriteGenerationOptions = {}
): Promise<{ imageUrl: string; seed: number }> {
  const {
    size = 64,
    pose,
    palette = 'default',
    style = 'default',
    seed = Math.floor(Math.random() * 2147483647),
    removeBackground = true,
  } = options;

  // Build optimized prompt with framing, pose, and palette
  const optimizedPrompt = buildSpritePrompt(characterDescription, { pose, palette });

  console.log('Generating game sprite:', {
    description: characterDescription,
    size,
    pose,
    palette,
    style,
    optimizedPrompt,
  });

  const imageUrl = await generateWithRetroDiffusion({
    prompt: optimizedPrompt,
    style,
    width: size,
    height: size,
    seed,
    removeBackground,
  });

  return { imageUrl, seed };
}

/**
 * Generate item sheet using Retro Diffusion
 */
export async function generateItemSheet(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    seed?: number;
  }
): Promise<string> {
  return generateWithRetroDiffusion({
    prompt,
    width: options?.width || 256,
    height: options?.height || 256,
    style: 'item_sheet',
    seed: options?.seed,
    removeBackground: true,
  });
}

// Animation style types for rd-animation model
export type AnimationStyle =
  | 'animation__four_angle_walking'  // 4 directions x 4 frames walking
  | 'animation__small_sprites';       // Smaller sprites

export interface AnimationResult {
  spriteSheetUrl: string;
  frames?: string[];  // Individual frame URLs
  frameCount: number;
  directions: number;
  seed: number;
}

/**
 * Generate a walking animation using rd-plus with the user's actual prompt
 *
 * NOTE: rd-animation model ignores custom prompts and produces generic characters.
 * We use rd-plus instead to generate individual walk frames that respect the prompt.
 * To maintain character consistency, we generate frame 1 first, then use img2img
 * with that frame as reference for subsequent frames.
 */
export async function generateWalkingAnimation(
  prompt: string,
  options?: {
    seed?: number;
    direction?: 'front' | 'right' | 'back' | 'left';
    frameCount?: number;
  }
): Promise<AnimationResult> {
  const seed = options?.seed || Math.floor(Math.random() * 2147483647);
  const direction = options?.direction || 'right';
  const frameCount = options?.frameCount || 4;

  console.log('Generating walking animation with rd-plus:', {
    prompt,
    direction,
    frameCount,
    seed,
  });

  // Direction view descriptions
  const directionViews: Record<string, string> = {
    front: 'front view, facing camera',
    right: 'side view, profile facing right',
    back: 'back view, facing away',
    left: 'side view, profile facing left',
  };

  // Walk cycle frame descriptions
  const walkFrames = [
    'walking pose frame 1, left foot forward, mid-stride',
    'walking pose frame 2, feet together, passing position',
    'walking pose frame 3, right foot forward, mid-stride',
    'walking pose frame 4, feet together, passing position',
  ];

  const frames: string[] = [];
  const directionView = directionViews[direction] || directionViews.right;

  // Generate frame 1 first (text-to-image)
  console.log('Generating walk frame 1/4 (base frame)...');
  const basePrompt = `${prompt}, ${directionView}, ${walkFrames[0]}, pixel art game sprite, full body visible, centered`;

  const firstFrameUrl = await generateWithRetroDiffusion({
    prompt: basePrompt,
    style: 'default',
    width: 64,
    height: 64,
    seed: seed,
    removeBackground: true,
  });
  frames.push(firstFrameUrl);

  // Fetch first frame and convert to base64 for img2img
  let baseImageBase64: string | null = null;
  try {
    const response = await fetch(firstFrameUrl);
    const arrayBuffer = await response.arrayBuffer();
    baseImageBase64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Base frame fetched for img2img reference');
  } catch (error) {
    console.error('Failed to fetch base frame for img2img, falling back to text-only:', error);
  }

  // Generate remaining frames using img2img with base frame as reference
  for (let i = 1; i < Math.min(frameCount, walkFrames.length); i++) {
    console.log(`Generating walk frame ${i + 1}/${frameCount}...`);

    const framePrompt = `${prompt}, ${directionView}, ${walkFrames[i]}, pixel art game sprite, full body visible, centered`;

    const imageUrl = await generateWithRetroDiffusion({
      prompt: framePrompt,
      style: 'default',
      width: 64,
      height: 64,
      seed: seed,
      removeBackground: true,
      // Use base frame as reference if available (img2img)
      inputImage: baseImageBase64 || undefined,
      strength: baseImageBase64 ? 0.6 : undefined, // Lower strength = more like original
    });

    frames.push(imageUrl);
  }

  // Create a horizontal sprite sheet from the frames
  // For now, return the first frame as spriteSheetUrl and include all frames
  return {
    spriteSheetUrl: frames[0],  // First frame as preview
    frames,  // All individual frames
    frameCount: frames.length,
    directions: 1,  // Single direction per generation
    seed,
  };
}

/**
 * Generate animation frames using rd-plus with sequential frame prompts
 * This gives more control over the animation style
 */
export async function generateAnimationFrames(
  prompt: string,
  options?: {
    motionType?: 'idle' | 'walk' | 'run' | 'attack' | 'jump';
    direction?: 'front' | 'right' | 'back' | 'left';
    frameCount?: number;
    width?: number;
    height?: number;
    seed?: number;
  }
): Promise<{ frames: string[]; seed: number }> {
  const replicate = getReplicateClient();
  if (!replicate) {
    throw new Error('Replicate API not configured. Set REPLICATE_API_TOKEN.');
  }

  const {
    motionType = 'idle',
    direction = 'right',
    frameCount = 4,
    width = 64,
    height = 64,
    seed = Math.floor(Math.random() * 2147483647),
  } = options || {};

  // Direction view descriptions
  const directionViews: Record<string, string> = {
    front: 'front view, facing camera',
    right: 'side view, profile facing right',
    back: 'back view, facing away',
    left: 'side view, profile facing left',
  };

  const directionView = directionViews[direction] || directionViews.right;

  // Motion frame descriptions for each type
  const motionFrames: Record<string, string[]> = {
    idle: [
      'standing still, neutral pose',
      'subtle breathing, slight body movement',
      'relaxed stance, gentle sway',
      'returning to neutral pose',
    ],
    walk: [
      'walking cycle frame 1, left foot forward',
      'walking cycle frame 2, passing position',
      'walking cycle frame 3, right foot forward',
      'walking cycle frame 4, passing position',
    ],
    run: [
      'running cycle frame 1, pushing off',
      'running cycle frame 2, airborne',
      'running cycle frame 3, landing',
      'running cycle frame 4, mid-stride',
    ],
    attack: [
      'attack windup, preparing to strike',
      'attack swing, weapon raised',
      'attack impact, full extension',
      'attack recovery, returning to stance',
    ],
    jump: [
      'jump crouch, preparing to leap',
      'jump ascent, rising up',
      'jump peak, at highest point',
      'jump descent, falling down',
    ],
  };

  const frameDescriptions = motionFrames[motionType] || motionFrames.idle;
  const frames: string[] = [];

  console.log('Generating animation frames with rd-plus:', {
    prompt,
    motionType,
    direction,
    frameCount,
    seed,
  });

  // Generate frame 1 first (text-to-image) as the base character
  console.log(`Generating ${motionType} frame 1/${frameCount} (base frame)...`);
  const basePrompt = `${directionView}, ${prompt}, ${frameDescriptions[0]}, pixel art game sprite, full body visible, centered`;

  const firstFrameUrl = await generateWithRetroDiffusion({
    prompt: basePrompt,
    style: 'default',
    width,
    height,
    seed: seed,
    removeBackground: true,
  });
  frames.push(firstFrameUrl);

  // Fetch first frame and convert to base64 for img2img
  let baseImageBase64: string | null = null;
  try {
    const response = await fetch(firstFrameUrl);
    const arrayBuffer = await response.arrayBuffer();
    baseImageBase64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Base frame fetched for img2img reference');
  } catch (error) {
    console.error('Failed to fetch base frame for img2img, falling back to text-only:', error);
  }

  // Generate remaining frames using img2img with base frame as reference
  for (let i = 1; i < Math.min(frameCount, frameDescriptions.length); i++) {
    console.log(`Generating ${motionType} frame ${i + 1}/${frameCount}...`);

    // Put direction FIRST for emphasis, then character, then frame action
    const framePrompt = `${directionView}, ${prompt}, ${frameDescriptions[i]}, pixel art game sprite, full body visible, centered`;

    const frameUrl = await generateWithRetroDiffusion({
      prompt: framePrompt,
      style: 'default',
      width,
      height,
      seed: seed,
      removeBackground: true,
      // Use base frame as reference if available (img2img)
      inputImage: baseImageBase64 || undefined,
      strength: baseImageBase64 ? 0.6 : undefined, // Lower strength = more like original
    });

    frames.push(frameUrl);
  }

  return { frames, seed };
}

/**
 * Generate a single game background layer using Retro Diffusion
 * Uses environment style for best background results
 * Now includes negative prompts for better quality control
 */
export async function generateGameBackground(
  description: string,
  options: BackgroundGenerationOptions = {}
): Promise<BackgroundResult> {
  const {
    theme = 'forest',
    layer = 'midground',
    palette = 'default',
    width = 256,
    height = 128,
    seed = Math.floor(Math.random() * 2147483647),
    seamless = true,
  } = options;

  // Build optimized prompt with theme, layer, and style (now includes negative prompt)
  const { prompt: optimizedPrompt, negativePrompt } = buildBackgroundPrompt(description, {
    theme,
    layer,
    palette,
    seamless,
  });

  console.log('Generating game background:', {
    description,
    theme,
    layer,
    width,
    height,
    optimizedPrompt: optimizedPrompt.substring(0, 100) + '...',
    hasNegativePrompt: !!negativePrompt,
  });

  // Use environment style for backgrounds, topdown_asset for ground layers
  // Note: topdown_map doesn't exist in RD - use topdown_asset instead
  const style: RetroDiffusionStyle = layer === 'ground' ? 'topdown_asset' : 'environment';

  const imageUrl = await generateWithRetroDiffusion({
    prompt: optimizedPrompt,
    negativePrompt, // Now passing negative prompt for better quality
    style,
    width,
    height,
    seed,
    removeBackground: layer !== 'sky' && layer !== 'ground', // Keep bg for sky/ground, transparent for layers
  });

  return {
    imageUrl,
    seed,
    layer,
    theme,
  };
}

/**
 * Generate a complete parallax background set with multiple layers
 * Generates sky, far, midground, foreground, and ground layers
 */
export async function generateParallaxBackground(
  description: string,
  options: {
    theme?: BackgroundTheme;
    palette?: ColorPalette;
    width?: number;
    height?: number;
    layers?: BackgroundLayer[];
    seed?: number;
  } = {}
): Promise<ParallaxBackgroundResult> {
  const {
    theme = 'forest',
    palette = 'default',
    width = 256,
    height = 128,
    layers = ['sky', 'far', 'midground', 'foreground', 'ground'],
    seed = Math.floor(Math.random() * 2147483647),
  } = options;

  console.log('Generating parallax background set:', {
    description,
    theme,
    layers,
    width,
    height,
  });

  const result: ParallaxBackgroundResult = {
    layers: {},
    seed,
    theme,
  };

  // Generate each requested layer
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    console.log(`Generating ${layer} layer (${i + 1}/${layers.length})...`);

    try {
      const layerResult = await generateGameBackground(description, {
        theme,
        layer,
        palette,
        width,
        height,
        seed: seed + i, // Consistent seed variation per layer
        seamless: true,
      });

      result.layers[layer] = layerResult.imageUrl;
      console.log(`${layer} layer generated successfully`);
    } catch (error) {
      console.error(`Failed to generate ${layer} layer:`, error);
      // Continue with other layers
    }
  }

  return result;
}

// ==========================================
// Skeleton-Guided Animation Generation
// Uses skeleton pose images to guide AI generation
// ==========================================

export interface SkeletonAnimationOptions {
  seed?: number;
  width?: number;
  height?: number;
  poseStrength?: number; // How closely to follow the pose (0.4-0.8 recommended)
}

export interface SkeletonAnimationResult {
  frames: string[];
  seed: number;
}

/**
 * Generate a character frame guided by a skeleton pose image
 *
 * This function takes a character reference and a pose silhouette,
 * then generates the character in that pose using img2img.
 *
 * @param characterPrompt - Description of the character
 * @param poseDescription - Text description of the pose (e.g., "walking, left foot forward")
 * @param poseImage - Base64 encoded skeleton pose silhouette (optional, for img2img guidance)
 * @param referenceImage - Base64 encoded reference character image (optional)
 * @param options - Generation options
 */
export async function generateSkeletonGuidedFrame(
  characterPrompt: string,
  poseDescription: string,
  poseImage?: string,
  referenceImage?: string,
  options: SkeletonAnimationOptions = {}
): Promise<string> {
  const {
    seed = Math.floor(Math.random() * 2147483647),
    width = 64,
    height = 64,
    poseStrength = 0.6,
  } = options;

  // Build the full prompt with character and pose
  const fullPrompt = `${characterPrompt}, ${poseDescription}, pixel art game sprite, full body visible, centered, clean edges`;

  console.log('Generating skeleton-guided frame:', {
    characterPrompt,
    poseDescription,
    hasReferenceImage: !!referenceImage,
    hasPoseImage: !!poseImage,
    seed,
  });

  // If we have a reference image, use it for better character consistency
  // If we have a pose image, use it to guide the pose
  const inputImage = referenceImage || poseImage;
  const strength = referenceImage ? poseStrength : 0.7;

  const imageUrl = await generateWithRetroDiffusion({
    prompt: fullPrompt,
    style: 'default',
    width,
    height,
    seed,
    removeBackground: true,
    inputImage,
    strength: inputImage ? strength : undefined,
  });

  return imageUrl;
}

/**
 * Generate a complete animation sequence using skeleton poses
 *
 * This generates each frame of an animation by providing skeleton pose
 * guidance and maintaining character consistency through img2img.
 *
 * @param characterPrompt - Description of the character
 * @param poseDescriptions - Array of pose descriptions for each frame
 * @param poseImages - Array of base64 skeleton pose images (optional)
 * @param options - Generation options
 */
export async function generateSkeletonAnimation(
  characterPrompt: string,
  poseDescriptions: string[],
  poseImages?: string[],
  options: SkeletonAnimationOptions = {}
): Promise<SkeletonAnimationResult> {
  const {
    seed = Math.floor(Math.random() * 2147483647),
    width = 64,
    height = 64,
    poseStrength = 0.55,
  } = options;

  console.log('Generating skeleton animation:', {
    characterPrompt,
    frameCount: poseDescriptions.length,
    hasPoseImages: !!poseImages,
    seed,
  });

  const frames: string[] = [];
  let referenceImage: string | null = null;

  // Generate each frame
  for (let i = 0; i < poseDescriptions.length; i++) {
    console.log(`Generating skeleton frame ${i + 1}/${poseDescriptions.length}...`);

    const poseDescription = poseDescriptions[i];
    const poseImage = poseImages?.[i];

    // For first frame, generate from scratch (or with pose only)
    // For subsequent frames, use first frame as reference for consistency
    const frameUrl = await generateSkeletonGuidedFrame(
      characterPrompt,
      poseDescription,
      poseImage,
      referenceImage || undefined,
      {
        seed,
        width,
        height,
        poseStrength,
      }
    );

    frames.push(frameUrl);

    // After first frame, fetch it for use as reference
    if (i === 0 && !referenceImage) {
      try {
        const response = await fetch(frameUrl);
        const arrayBuffer = await response.arrayBuffer();
        referenceImage = Buffer.from(arrayBuffer).toString('base64');
        console.log('Base frame captured for consistency');
      } catch (error) {
        console.error('Failed to capture base frame:', error);
      }
    }
  }

  return {
    frames,
    seed,
  };
}

/**
 * Pose description templates for common animations
 * These can be used with generateSkeletonAnimation
 */
export const POSE_DESCRIPTIONS = {
  walk: [
    'walking pose, right foot forward, left arm forward, mid-stride',
    'walking pose, feet together, passing position, arms at sides',
    'walking pose, left foot forward, right arm forward, mid-stride',
    'walking pose, feet together, passing position, arms at sides',
  ],
  run: [
    'running pose, pushing off, right leg back, left arm forward',
    'running pose, airborne, legs tucked, arms pumping',
    'running pose, landing, left leg forward, right arm forward',
    'running pose, airborne, legs tucked, arms pumping',
  ],
  idle: [
    'standing idle, neutral pose, arms relaxed at sides',
    'standing idle, slight breathing motion, subtle movement',
    'standing idle, relaxed stance, gentle sway',
    'standing idle, returning to neutral pose',
  ],
  attack: [
    'attack windup, arm pulled back, preparing to strike',
    'attack peak, weapon raised high, tension pose',
    'attack swing, striking forward, arm extended',
    'attack follow through, recovery stance',
  ],
  jump: [
    'jump crouch, knees bent, preparing to leap',
    'jump ascent, body stretched upward, arms up',
    'jump peak, at highest point, legs tucked',
    'jump descent, preparing to land, arms out for balance',
  ],
} as const;

export type PoseAnimationType = keyof typeof POSE_DESCRIPTIONS;

/**
 * Convenience function to generate animation using preset pose descriptions
 */
export async function generatePresetAnimation(
  characterPrompt: string,
  animationType: PoseAnimationType,
  options: SkeletonAnimationOptions = {}
): Promise<SkeletonAnimationResult> {
  const poseDescriptions = POSE_DESCRIPTIONS[animationType];
  return generateSkeletonAnimation(characterPrompt, [...poseDescriptions], undefined, options);
}
