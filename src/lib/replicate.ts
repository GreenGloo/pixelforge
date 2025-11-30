// ==========================================
// Replicate API Client for AnimateDiff & Character Rotation
// ==========================================

import Replicate from 'replicate';

// Check if Replicate API token is configured
export function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

// Lazy initialization to avoid errors when token is missing
let _replicate: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured. Please add it to your .env file.');
  }
  if (!_replicate) {
    _replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }
  return _replicate;
}

export interface AnimationGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numFrames?: number;
  fps?: number;
  motionType?: 'walk' | 'run' | 'idle' | 'attack' | 'jump' | 'custom';
  direction?: 'left' | 'right' | 'up' | 'down';
  seed?: number;
}

export interface AnimationResult {
  videoUrl: string;
  frames: string[];
  seed: number;
}

// Motion prompts for different animation types
const MOTION_PROMPTS: Record<string, string> = {
  walk: 'walking animation, step by step movement, smooth walk cycle',
  run: 'running animation, fast movement, dynamic run cycle',
  idle: 'idle animation, breathing, subtle movement, standing still',
  attack: 'attack animation, swinging, striking motion, combat',
  jump: 'jumping animation, leap, airborne, landing',
};

const DIRECTION_PROMPTS: Record<string, string> = {
  left: 'facing left, side view',
  right: 'facing right, side view',
  up: 'facing up, back view',
  down: 'facing down, front view',
};

// Generate animation using AnimateDiff
export async function generateAnimation(
  params: AnimationGenerationParams
): Promise<AnimationResult> {
  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted, deformed, ugly',
    width = 512,
    height = 512,
    numFrames = 16,
    fps = 8,
    motionType = 'idle',
    direction = 'right',
    seed,
  } = params;

  // Build enhanced prompt for pixel art animation
  const motionPrompt = MOTION_PROMPTS[motionType] || '';
  const directionPrompt = DIRECTION_PROMPTS[direction] || '';

  const enhancedPrompt = `pixel art, ${prompt}, ${motionPrompt}, ${directionPrompt}, game sprite animation, 2D game asset, clean lines, consistent style, pixel perfect`;

  const enhancedNegative = `${negativePrompt}, 3D, realistic, photograph, smooth gradients, anti-aliasing, blending`;

  try {
    const replicate = getReplicateClient();

    // Using AnimateDiff for animation generation
    // Full version hash from Replicate: beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f
    console.log('Starting AnimateDiff generation with prompt:', enhancedPrompt.substring(0, 100));

    const output = await replicate.run(
      'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f',
      {
        input: {
          prompt: enhancedPrompt,
          negative_prompt: enhancedNegative,
          motion_module: 'mm_sd_v15_v2',
          path: 'toonyou_beta3.safetensors',
          steps: 25,
          guidance_scale: 7.5,
          seed: seed || Math.floor(Math.random() * 2147483647),
        },
      }
    );

    console.log('Replicate output type:', typeof output);
    console.log('Replicate raw output:', output);

    // Handle different output formats from Replicate SDK
    // The SDK v0.25+ returns FileOutput objects with url() method
    let videoUrl: string;

    // Helper to extract URL from FileOutput or string
    const extractUrl = (item: unknown): string | null => {
      if (typeof item === 'string' && item.startsWith('http')) {
        return item;
      }
      // FileOutput has a url() method that returns a URL object
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        // Check for url() method (FileOutput)
        if (typeof obj.url === 'function') {
          const urlResult = (obj.url as () => URL)();
          return urlResult.href || urlResult.toString();
        }
        // Check for href property
        if (typeof obj.href === 'string') {
          return obj.href;
        }
      }
      return null;
    };

    if (typeof output === 'string' && output.startsWith('http')) {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      // Array of FileOutputs or URLs
      const url = extractUrl(output[0]);
      if (url) {
        videoUrl = url;
      } else {
        throw new Error('Could not extract URL from array output');
      }
    } else if (output && typeof output === 'object') {
      // Single FileOutput or object with URL
      const url = extractUrl(output);
      if (url) {
        videoUrl = url;
      } else {
        // Check for nested output property
        const outputObj = output as Record<string, unknown>;
        if ('output' in outputObj) {
          const nestedUrl = extractUrl(outputObj.output);
          if (nestedUrl) {
            videoUrl = nestedUrl;
          } else if (Array.isArray(outputObj.output) && outputObj.output.length > 0) {
            const arrUrl = extractUrl(outputObj.output[0]);
            if (arrUrl) {
              videoUrl = arrUrl;
            } else {
              throw new Error('Could not extract URL from nested array output');
            }
          } else {
            throw new Error('Could not extract URL from nested output');
          }
        } else {
          console.error('Unexpected output structure:', Object.keys(outputObj));
          throw new Error('No video URL found in animation model output');
        }
      }
    } else {
      console.error('Unexpected Replicate output format:', output);
      throw new Error('Unexpected output format from animation model');
    }

    console.log('Extracted video URL:', videoUrl);

    // Extract frames from video (done client-side or via API)
    return {
      videoUrl,
      frames: [], // Will be extracted on client
      seed: seed || 0,
    };
  } catch (error) {
    console.error('AnimateDiff generation error:', error);
    throw new Error('Failed to generate animation');
  }
}

// Alternative: Use Stable Video Diffusion for image-to-video
export async function animateImage(
  imageUrl: string,
  params: Partial<AnimationGenerationParams>
): Promise<AnimationResult> {
  const {
    numFrames = 14,
    fps = 6,
    seed,
  } = params;

  try {
    const replicate = getReplicateClient();

    // Using Stable Video Diffusion
    const output = await replicate.run(
      'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
      {
        input: {
          input_image: imageUrl,
          video_length: 'short', // 14 frames
          sizing_strategy: 'maintain_aspect_ratio',
          motion_bucket_id: 127, // Higher = more motion
          cond_aug: 0.02,
          decoding_t: 7,
          seed: seed || Math.floor(Math.random() * 1000000),
        },
      }
    );

    const videoUrl = output as unknown as string;

    return {
      videoUrl,
      frames: [],
      seed: seed || 0,
    };
  } catch (error) {
    console.error('Image animation error:', error);
    throw new Error('Failed to animate image');
  }
}

// Extract frames from video (helper for client-side processing)
export async function extractFramesFromVideo(
  videoUrl: string,
  numFrames: number
): Promise<string[]> {
  // This would typically be done client-side using canvas
  // Server-side could use ffmpeg if needed
  return [];
}

// Cost estimation for generation
export function estimateCost(numFrames: number, width: number, height: number): number {
  // Approximate cost based on Replicate pricing
  // AnimateDiff: ~$0.05-0.10 per generation
  const baseCost = 0.05;
  const frameFactor = numFrames / 16;
  const sizeFactor = (width * height) / (512 * 512);

  return Math.round((baseCost * frameFactor * sizeFactor) * 100) / 100;
}

// Credit cost for users (10 credits = ~$0.10)
export function creditCost(numFrames: number): number {
  // Base: 5 credits for 8-16 frames
  // +2 credits per additional 8 frames
  const baseCredits = 5;
  const additionalCredits = Math.max(0, Math.floor((numFrames - 16) / 8) * 2);
  return baseCredits + additionalCredits;
}

// ==========================================
// Sprite Rotation using Retro Diffusion API
// Purpose-built for 4-angle pixel art sprites
//
// CRITICAL SIZE CONSTRAINTS (from RetroDiffusion docs):
// - animation__four_angle_walking: LOCKED to 48x48
// - animation__small_sprites: LOCKED to 32x32
// - animation__8_dir_rotation: 8-directional rotation
// ==========================================

const RETRODIFFUSION_API_URL = 'https://api.retrodiffusion.ai/v1/inferences';

export interface SpriteRotationParams {
  prompt: string;
  inputImage?: string; // Base64 or URL of source sprite
  width?: number;
  height?: number;
  seed?: number;
  removeBackground?: boolean;
}

export interface SpriteRotationResult {
  frontUrl: string;
  rightUrl: string;
  backUrl: string;
  leftUrl: string;
  spritesheetUrl?: string;
  seed: number;
}

/**
 * Generate 4-directional sprite rotations using Retro Diffusion API
 *
 * IMPORTANT: animation__four_angle_walking is LOCKED to 48x48 pixels
 * The model generates a 4x4 spritesheet with 4 directions x 4 frames
 */
export async function generateSpriteRotations(
  params: SpriteRotationParams
): Promise<SpriteRotationResult> {
  const {
    prompt,
    inputImage,
    width = 48,  // LOCKED to 48 for four_angle_walking
    height = 48, // LOCKED to 48 for four_angle_walking
    seed = Math.floor(Math.random() * 2147483647),
    removeBackground = true,
  } = params;

  // Check for RetroDiffusion API token
  const apiToken = process.env.RETRODIFFUSION_API_TOKEN || process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    // Fallback to Replicate if no direct API token
    return generateSpriteRotationsViaReplicate(params);
  }

  // Determine the correct style based on requested size
  // animation__four_angle_walking is LOCKED to 48x48
  // animation__small_sprites is LOCKED to 32x32
  let promptStyle = 'animation__four_angle_walking';
  let actualWidth = 48;
  let actualHeight = 48;

  if (width <= 32 && height <= 32) {
    promptStyle = 'animation__small_sprites';
    actualWidth = 32;
    actualHeight = 32;
  }

  const payload: Record<string, unknown> = {
    prompt: `${prompt}, pixel art game sprite, character design`,
    prompt_style: promptStyle,
    width: actualWidth,
    height: actualHeight,
    num_images: 1,
    seed,
    return_spritesheet: true,
  };

  // Add reference image for consistency if provided (must be a valid URL)
  if (inputImage && inputImage.startsWith('http')) {
    payload.input_image = inputImage;
  }
  // Note: RetroDiffusion API may not support base64 directly

  try {
    console.log(`Generating sprite rotations with RetroDiffusion (${promptStyle}, ${actualWidth}x${actualHeight})...`);

    const response = await fetch(RETRODIFFUSION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RD-Token': apiToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RetroDiffusion API error:', errorText);
      throw new Error(`RetroDiffusion API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('RetroDiffusion response:', JSON.stringify(data, null, 2));

    // Extract the spritesheet URL
    let spritesheetUrl = '';
    if (data.images && data.images.length > 0) {
      spritesheetUrl = data.images[0];
    } else if (data.image_url) {
      spritesheetUrl = data.image_url;
    } else if (typeof data === 'string') {
      spritesheetUrl = data;
    }

    if (!spritesheetUrl) {
      throw new Error('No output from RetroDiffusion');
    }

    // The spritesheet contains all 4 directions in a grid
    // For now, return the full spritesheet - the frontend will parse it
    return {
      frontUrl: spritesheetUrl,
      rightUrl: spritesheetUrl,
      backUrl: spritesheetUrl,
      leftUrl: spritesheetUrl,
      spritesheetUrl,
      seed,
    };
  } catch (error) {
    console.error('RetroDiffusion sprite rotation error:', error);
    // Fallback to Replicate
    return generateSpriteRotationsViaReplicate(params);
  }
}

/**
 * Fallback: Generate rotations via Replicate if direct API fails
 */
async function generateSpriteRotationsViaReplicate(
  params: SpriteRotationParams
): Promise<SpriteRotationResult> {
  const {
    prompt,
    inputImage,
    width = 48,
    height = 48,
    seed = Math.floor(Math.random() * 2147483647),
  } = params;

  const replicate = getReplicateClient();

  // Use Retro Diffusion's rd-animation model via Replicate
  // NOTE: animation__four_angle_walking is LOCKED to 48x48
  const input: Record<string, unknown> = {
    prompt: `${prompt}, pixel art game sprite`,
    prompt_style: 'animation__four_angle_walking',
    width: 48,  // LOCKED
    height: 48, // LOCKED
    seed: seed,
    return_spritesheet: true,
  };

  // Only include input_image if it's a valid URL (not empty or base64)
  if (inputImage && inputImage.startsWith('http')) {
    input.input_image = inputImage;
  }
  // Note: Replicate rd-animation requires URI format, not base64

  try {
    console.log('Generating sprite rotations via Replicate (retro-diffusion/rd-animation)...');

    const output = await replicate.run(
      'retro-diffusion/rd-animation' as `${string}/${string}`,
      { input }
    );

    // Extract URLs from output
    const extractUrl = (item: unknown): string | null => {
      if (typeof item === 'string' && item.startsWith('http')) {
        return item;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (typeof obj.url === 'function') {
          const urlResult = (obj.url as () => URL)();
          return urlResult.href || urlResult.toString();
        }
        if (typeof obj.href === 'string') {
          return obj.href;
        }
      }
      return null;
    };

    let urls: string[] = [];

    if (Array.isArray(output)) {
      for (const item of output) {
        const url = extractUrl(item);
        if (url) urls.push(url);
      }
    } else {
      const url = extractUrl(output);
      if (url) urls.push(url);
    }

    if (urls.length === 0) {
      throw new Error('No output URLs from Replicate sprite rotation model');
    }

    return {
      frontUrl: urls[0],
      rightUrl: urls[0],
      backUrl: urls[0],
      leftUrl: urls[0],
      spritesheetUrl: urls[0],
      seed,
    };
  } catch (error) {
    console.error('Replicate sprite rotation error:', error);
    throw new Error('Failed to generate sprite rotations');
  }
}

/**
 * Alternative: Use SD Pixel Art Spritesheet Generator
 * This model has specific keywords for each view direction
 */
export async function generateSpriteView(
  prompt: string,
  direction: 'front' | 'right' | 'back' | 'left',
  options?: {
    width?: number;
    height?: number;
    seed?: number;
    referenceImage?: string;
  }
): Promise<string> {
  const replicate = getReplicateClient();

  // Direction-specific keywords for the SD Pixel Art model
  const directionKeywords: Record<string, string> = {
    front: 'PixelartFSS', // Front Side Sprite
    right: 'PixelartRSS', // Right Side Sprite
    back: 'PixelartBSS',  // Back Side Sprite
    left: 'PixelartLSS',  // Left Side Sprite
  };

  const enhancedPrompt = `${directionKeywords[direction]}, ${prompt}, pixel art game sprite, clean pixels, consistent style`;

  const input: Record<string, unknown> = {
    prompt: enhancedPrompt,
    width: options?.width || 256,
    height: options?.height || 256,
    num_outputs: 1,
    num_inference_steps: 50,
    guidance_scale: 10,
    seed: options?.seed || Math.floor(Math.random() * 2147483647),
  };

  try {
    const output = await replicate.run(
      'cjwbw/sd_pixelart_spritesheet_generator' as `${string}/${string}`,
      { input }
    );

    // Extract URL
    if (Array.isArray(output) && output.length > 0) {
      const item = output[0];
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (typeof obj.url === 'function') {
          return ((obj.url as () => URL)()).href;
        }
      }
    }

    throw new Error('No output from sprite view generation');
  } catch (error) {
    console.error('Sprite view generation error:', error);
    throw new Error(`Failed to generate ${direction} view`);
  }
}

/**
 * Generate all 4 views using the SD Pixel Art model
 * Uses same seed + direction keywords for consistency
 */
export async function generateAllSpriteViews(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    seed?: number;
  }
): Promise<SpriteRotationResult> {
  const seed = options?.seed || Math.floor(Math.random() * 2147483647);

  // Generate all 4 views with the same seed for consistency
  const [frontUrl, rightUrl, backUrl, leftUrl] = await Promise.all([
    generateSpriteView(prompt, 'front', { ...options, seed }),
    generateSpriteView(prompt, 'right', { ...options, seed }),
    generateSpriteView(prompt, 'back', { ...options, seed }),
    generateSpriteView(prompt, 'left', { ...options, seed }),
  ]);

  return {
    frontUrl,
    rightUrl,
    backUrl,
    leftUrl,
    seed,
  };
}

// ==========================================
// Zero123++ Multi-View Generation
// True novel view synthesis from a single image
// Generates 6 consistent views at fixed camera angles
// ==========================================

export interface Zero123PlusPlusResult {
  views: string[];  // 6 view images
  frontUrl: string;
  rightUrl: string;
  backUrl: string;
  leftUrl: string;
}

/**
 * Generate multi-view images from a single reference image using Zero123++
 * This model performs TRUE novel view synthesis - it actually rotates the character
 *
 * Fixed output angles:
 * - Azimuth: 30°, 90°, 150°, 210°, 270°, 330°
 * - Elevation: 30°, -20°, 30°, -20°, 30°, -20°
 *
 * @param imageUrl - URL of the input image (must be accessible URL, not base64)
 * @param removeBackground - Whether to remove background first
 */
export async function generateMultiViewZero123(
  imageUrl: string,
  removeBackground: boolean = true
): Promise<Zero123PlusPlusResult> {
  const replicate = getReplicateClient();

  console.log('Generating multi-view images with Zero123++...');
  console.log('Input image:', imageUrl.substring(0, 50) + '...');

  try {
    const output = await replicate.run(
      'jd7h/zero123plusplus:c69c6559a29011b576f1ff0371b3bc1add2856480c60520c7e9ce0b40a6e9052',
      {
        input: {
          image: imageUrl,
          remove_background: removeBackground,
          return_intermediate_images: false,
        },
      }
    );

    console.log('Zero123++ output:', output);

    // Extract URLs from output
    const extractUrls = (output: unknown): string[] => {
      const urls: string[] = [];

      if (Array.isArray(output)) {
        for (const item of output) {
          if (typeof item === 'string' && item.startsWith('http')) {
            urls.push(item);
          } else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            if (typeof obj.url === 'function') {
              urls.push(((obj.url as () => URL)()).href);
            } else if (typeof obj.href === 'string') {
              urls.push(obj.href);
            }
          }
        }
      }

      return urls;
    };

    const views = extractUrls(output);

    if (views.length === 0) {
      throw new Error('No views generated by Zero123++');
    }

    console.log(`Generated ${views.length} views`);

    // Map the 6 views to our 4-direction format
    // Zero123++ azimuth angles: 30°, 90°, 150°, 210°, 270°, 330°
    // We'll use: 0=30°(front-right), 1=90°(right), 2=150°(back-right),
    //            3=210°(back-left), 4=270°(left), 5=330°(front-left)
    return {
      views,
      frontUrl: views[0] || views[0],  // Use first view as front
      rightUrl: views[1] || views[0],  // 90° azimuth = right side
      backUrl: views[2] || views[3] || views[0],  // 150° or 210° for back
      leftUrl: views[4] || views[0],  // 270° azimuth = left side
    };
  } catch (error) {
    console.error('Zero123++ generation error:', error);
    throw new Error('Failed to generate multi-view images with Zero123++');
  }
}

/**
 * Upload a base64 image to a temporary hosting service to get a URL
 * Required because most AI APIs don't accept base64 directly
 */
export async function uploadBase64ToUrl(base64Image: string): Promise<string> {
  // Option 1: Use a data URL directly if the API supports it
  if (base64Image.startsWith('data:image/')) {
    return base64Image;
  }

  // Option 2: Convert to data URL format
  const dataUrl = `data:image/png;base64,${base64Image}`;
  return dataUrl;
}

/**
 * Generate sprite rotations from an existing sprite image
 * Uses Zero123++ for true 3D-aware rotation
 */
export async function generateRotationsFromImage(
  imageBase64OrUrl: string,
  options?: {
    removeBackground?: boolean;
  }
): Promise<SpriteRotationResult> {
  // Convert base64 to data URL if needed
  let imageUrl = imageBase64OrUrl;
  if (!imageBase64OrUrl.startsWith('http') && !imageBase64OrUrl.startsWith('data:')) {
    imageUrl = `data:image/png;base64,${imageBase64OrUrl}`;
  }

  const result = await generateMultiViewZero123(imageUrl, options?.removeBackground ?? true);

  return {
    frontUrl: result.frontUrl,
    rightUrl: result.rightUrl,
    backUrl: result.backUrl,
    leftUrl: result.leftUrl,
    seed: 0,  // Zero123++ doesn't use seeds
  };
}

// ==========================================
// Ideogram Character API for Sprite Rotation
// Uses character reference to maintain identity while changing view
// This is our CUSTOM sprite rotation solution
// ==========================================

export interface IdeogramCharacterResult {
  frontUrl: string;
  rightUrl: string;
  backUrl: string;
  leftUrl: string;
}

export interface IdeogramCharacterParams {
  characterDescription?: string;  // Optional description to guide generation
  style?: 'pixel_art' | 'general' | 'realistic' | 'design';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  speed?: 'turbo' | 'quality';  // turbo = $0.10, quality = $0.20
}

/**
 * Generate a single character view using Flux Kontext Max
 * Then remove background using Replicate's background removal
 *
 * @param characterImage - Base64 data URL or HTTP URL of the source sprite
 * @param viewPrompt - Directional prompt like "facing right side view"
 * @param params - Additional generation parameters
 */
async function generateCharacterView(
  characterImage: string,
  viewPrompt: string,
  params?: IdeogramCharacterParams
): Promise<string> {
  const replicate = getReplicateClient();

  // Build the prompt for pixel art sprite - emphasize pixel art strongly
  const basePrompt = params?.characterDescription
    ? `${params.characterDescription}, ${viewPrompt}`
    : `this character, ${viewPrompt}`;

  // Strong pixel art emphasis in prompt
  const fullPrompt = `16-bit pixel art game sprite, ${basePrompt}, pixelated style, retro game graphics, clean pixel edges, transparent background, game asset, consistent pixel art style, same character, no anti-aliasing, blocky pixels, isolated on white background`;

  console.log(`Generating character view: ${viewPrompt.substring(0, 50)}...`);

  try {
    // Use Flux Kontext Max - specifically designed for character reference
    const output = await replicate.run(
      'black-forest-labs/flux-kontext-max' as `${string}/${string}`,
      {
        input: {
          prompt: fullPrompt,
          input_image: characterImage,  // Character reference image
          aspect_ratio: '1:1',
          output_format: 'png',
          safety_tolerance: 2,
        },
      }
    );

    // Extract URL from output
    const extractUrl = (item: unknown): string | null => {
      if (typeof item === 'string' && item.startsWith('http')) {
        return item;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (typeof obj.url === 'function') {
          const urlResult = (obj.url as () => URL)();
          return urlResult.href || urlResult.toString();
        }
        if (typeof obj.href === 'string') {
          return obj.href;
        }
      }
      return null;
    };

    let imageUrl: string | null = null;
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = extractUrl(output[0]);
    } else {
      imageUrl = extractUrl(output);
    }

    if (!imageUrl) {
      throw new Error('No output URL from Flux Kontext');
    }

    console.log(`Generated view URL: ${imageUrl.substring(0, 50)}...`);

    // Remove background using Replicate's background removal model
    try {
      console.log('Removing background from rotated view...');
      const bgRemovedOutput = await replicate.run(
        'lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1' as `${string}/${string}`,
        {
          input: {
            image: imageUrl,
          },
        }
      );

      // Extract URL from bg removal output
      let bgRemovedUrl: string | null = null;
      if (typeof bgRemovedOutput === 'string' && bgRemovedOutput.startsWith('http')) {
        bgRemovedUrl = bgRemovedOutput;
      } else if (Array.isArray(bgRemovedOutput) && bgRemovedOutput.length > 0) {
        bgRemovedUrl = extractUrl(bgRemovedOutput[0]);
      } else {
        bgRemovedUrl = extractUrl(bgRemovedOutput);
      }

      if (bgRemovedUrl) {
        console.log(`Background removed: ${bgRemovedUrl.substring(0, 50)}...`);
        return bgRemovedUrl;
      }
    } catch (bgError) {
      console.warn('Background removal failed, using original output:', bgError);
    }

    return imageUrl;
  } catch (error) {
    console.error('Character view generation error:', error);
    throw error;
  }
}

/**
 * Generate all 4 sprite rotations using Flux Kontext Max
 *
 * This is our CUSTOM solution for sprite rotation:
 * - Uses character reference to maintain identity
 * - Directional prompts control the viewing angle
 * - Generates pixel art style output
 *
 * @param sourceImage - Base64 data URL or HTTP URL of front-facing sprite
 * @param params - Additional generation parameters
 */
export async function generateCharacterRotations(
  sourceImage: string,
  params?: IdeogramCharacterParams
): Promise<IdeogramCharacterResult> {
  console.log('Starting Flux Kontext character rotation generation...');
  console.log('Source image type:', sourceImage.startsWith('data:') ? 'base64' : 'URL');

  // Direction prompts optimized for sprite rotation
  const directionPrompts = {
    right: 'facing right, side profile view, looking right',
    back: 'back view, from behind, rear view, facing away',
    left: 'facing left, side profile view, looking left',
  };

  try {
    // Generate all 3 rotated views in parallel (front is the original)
    const [rightUrl, backUrl, leftUrl] = await Promise.all([
      generateCharacterView(sourceImage, directionPrompts.right, params),
      generateCharacterView(sourceImage, directionPrompts.back, params),
      generateCharacterView(sourceImage, directionPrompts.left, params),
    ]);

    console.log('All character rotations generated successfully');

    return {
      frontUrl: sourceImage,  // Original is the front
      rightUrl,
      backUrl,
      leftUrl,
    };
  } catch (error) {
    console.error('Character rotation generation failed:', error);
    throw new Error('Failed to generate character rotations');
  }
}

/**
 * Alternative: Use Flux Kontext for character turnaround
 * This model is specifically designed for character reference + pose control
 */
export async function generateFluxKontextRotations(
  sourceImage: string,
  characterDescription?: string
): Promise<IdeogramCharacterResult> {
  const replicate = getReplicateClient();

  console.log('Starting Flux Kontext rotation generation...');

  const directionPrompts = {
    right: 'side view facing right, profile view',
    back: 'back view, from behind, rear angle',
    left: 'side view facing left, profile view',
  };

  const generateView = async (direction: string, prompt: string): Promise<string> => {
    const fullPrompt = characterDescription
      ? `${characterDescription}, ${prompt}, pixel art game sprite, clean edges`
      : `character sprite, ${prompt}, pixel art game sprite, clean edges`;

    try {
      const output = await replicate.run(
        'black-forest-labs/flux-kontext-pro' as `${string}/${string}`,
        {
          input: {
            prompt: fullPrompt,
            input_image: sourceImage,
            aspect_ratio: '1:1',
            output_format: 'png',
            safety_tolerance: 2,
          },
        }
      );

      // Extract URL
      if (typeof output === 'string' && output.startsWith('http')) {
        return output;
      }
      if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object') {
          const obj = first as Record<string, unknown>;
          if (typeof obj.url === 'function') {
            return ((obj.url as () => URL)()).href;
          }
        }
      }

      throw new Error(`No output for ${direction} view`);
    } catch (error) {
      console.error(`Flux Kontext ${direction} view error:`, error);
      throw error;
    }
  };

  try {
    const [rightUrl, backUrl, leftUrl] = await Promise.all([
      generateView('right', directionPrompts.right),
      generateView('back', directionPrompts.back),
      generateView('left', directionPrompts.left),
    ]);

    return {
      frontUrl: sourceImage,
      rightUrl,
      backUrl,
      leftUrl,
    };
  } catch (error) {
    console.error('Flux Kontext rotation failed:', error);
    throw new Error('Failed to generate rotations with Flux Kontext');
  }
}
