// ==========================================
// Runware API Client
// AI Image Generation Service
// ==========================================

interface RunwareGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  model?: string;
  lora?: string[];
  // IP-Adapter for character consistency
  ipAdapter?: {
    imageUrl: string;
    weight?: number; // 0-1, how much to use reference
  };
  // Remove background after generation
  removeBackground?: boolean;
}

interface RunwareImg2ImgParams {
  prompt: string;
  negativePrompt?: string;
  seedImage: string;  // Base64 or URL - CORRECT parameter name
  strength?: number;  // 0-1, how much to modify
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  model?: string;
  ipAdapter?: {
    imageUrl: string;
    weight?: number;
  };
  removeBackground?: boolean;
}

interface RunwareInpaintParams {
  prompt: string;
  negativePrompt?: string;
  imageUrl: string;  // Base64 data URL or URL of the source image
  maskUrl: string;   // Base64 data URL or URL of the mask (white = inpaint area)
  steps?: number;
  cfgScale?: number;
  seed?: number;
  strength?: number; // 0-1, how much to change masked area
}

interface RunwareResponse {
  imageURL: string;
  seed: number;
  positivePrompt: string;
  negativePrompt: string;
  width: number;
  height: number;
}

interface BackgroundRemovalParams {
  imageUrl: string;  // URL or base64 of image to process
  alphaMatting?: boolean;  // Better edge quality
  postProcessMask?: boolean;  // Smoother edges
}

// Style presets for pixel art generation
export const STYLE_PRESETS = {
  CHARACTER: {
    promptPrefix: 'pixel art character sprite, game asset, transparent background, centered, ',
    promptSuffix: ', 16-bit style, clean pixels, no anti-aliasing',
    negativePrompt: 'blurry, smooth, realistic, 3d render, photograph, gradient, anti-aliased, watermark',
  },
  ITEM: {
    promptPrefix: 'pixel art item icon, game asset, transparent background, centered, ',
    promptSuffix: ', 16-bit style, clean pixels, simple design',
    negativePrompt: 'blurry, smooth, realistic, complex, detailed background, watermark',
  },
  SCENE: {
    promptPrefix: 'pixel art scene, game background, ',
    promptSuffix: ', retro game style, detailed pixel work, vibrant colors',
    negativePrompt: 'blurry, smooth, realistic, photograph, 3d render, watermark',
  },
  TILE: {
    promptPrefix: 'pixel art seamless tileable texture, game asset, ',
    promptSuffix: ', repeating pattern, clean edges, game tile',
    negativePrompt: 'blurry, smooth, non-tileable, edges visible, watermark',
  },
  ANIMATION: {
    promptPrefix: 'pixel art animation frame, game sprite, ',
    promptSuffix: ', 16-bit style, clean pixels, action pose',
    negativePrompt: 'blurry, smooth, realistic, static, watermark',
  },
};

export class RunwareClient {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async generateImage(params: RunwareGenerationParams): Promise<RunwareResponse> {
    const {
      prompt,
      negativePrompt = '',
      width = 512,
      height = 512,
      steps = 20,
      cfgScale = 7,
      seed,
      model = 'runware:100@1', // Default SDXL model
    } = params;

    const taskUUID = this.generateUUID();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: prompt,
        negativePrompt,
        width,
        height,
        numberResults: 1,
        steps,
        CFGScale: cfgScale,
        seed: seed || Math.floor(Math.random() * 2147483647),
        model,
        outputFormat: 'PNG',
      }]),
    });

    const data = await response.json();

    console.log('Runware API response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Runware API error:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to generate image');
    }

    if (!data.data || data.data.length === 0) {
      console.error('Runware no data returned:', data);
      throw new Error('No image generated');
    }

    // Runware returns imageURL in the response
    const result = data.data[0];
    return {
      imageURL: result.imageURL,
      seed: result.seed || seed || 0,
      positivePrompt: prompt,
      negativePrompt,
      width,
      height,
    };
  }

  async generatePixelArt(
    prompt: string,
    style: keyof typeof STYLE_PRESETS,
    options: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      seed?: number;
    } = {}
  ): Promise<RunwareResponse> {
    const preset = STYLE_PRESETS[style];

    const fullPrompt = `${preset.promptPrefix}${prompt}${preset.promptSuffix}`;
    const fullNegative = `${preset.negativePrompt}, ${options.negativePrompt || ''}`.trim();

    return this.generateImage({
      prompt: fullPrompt,
      negativePrompt: fullNegative,
      width: options.width || 512,
      height: options.height || 512,
      seed: options.seed,
      steps: 25, // More steps for better quality
      cfgScale: 8,
      // Could add pixel art LoRA here if available
    });
  }

  async inpaint(params: RunwareInpaintParams): Promise<RunwareResponse> {
    const {
      prompt,
      negativePrompt = '',
      imageUrl,
      maskUrl,
      steps = 25,
      cfgScale = 7,
      seed,
      strength = 0.85,
    } = params;

    const taskUUID = this.generateUUID();

    // Runware expects base64 images without the data URL prefix
    const cleanImageUrl = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const cleanMaskUrl = maskUrl.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: prompt,
        negativePrompt,
        // Note: model parameter omitted to use Runware's default for inpainting
        seedImage: cleanImageUrl,
        maskImage: cleanMaskUrl,
        numberResults: 1,
        steps,
        CFGScale: cfgScale,
        seed: seed || Math.floor(Math.random() * 2147483647),
        strength,
        outputFormat: 'PNG',
      }]),
    });

    const data = await response.json();

    console.log('Runware Inpaint response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Runware Inpaint error:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to inpaint image');
    }

    if (!data.data || data.data.length === 0) {
      console.error('Runware Inpaint no data returned:', data);
      throw new Error('No inpainted image generated');
    }

    const result = data.data[0];
    return {
      imageURL: result.imageURL,
      seed: result.seed || seed || 0,
      positivePrompt: prompt,
      negativePrompt,
      width: result.width || 512,
      height: result.height || 512,
    };
  }

  /**
   * Remove background from an image
   * Uses Runware's removeBackground taskType
   */
  async removeBackground(params: BackgroundRemovalParams): Promise<string> {
    const {
      imageUrl,
      // alphaMatting not supported by current model
      postProcessMask = true,
    } = params;

    const taskUUID = this.generateUUID();

    // Clean base64 prefix if present
    const cleanImageUrl = imageUrl.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'removeBackground',
        taskUUID,
        inputImage: cleanImageUrl,
        outputFormat: 'PNG',
        // Don't include alphaMatting - not supported by latest model
        postProcessMask,
      }]),
    });

    const data = await response.json();

    console.log('Runware RemoveBackground response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Runware RemoveBackground error:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to remove background');
    }

    if (!data.data || data.data.length === 0) {
      throw new Error('No result from background removal');
    }

    return data.data[0].imageURL;
  }

  /**
   * Generate image with IP-Adapter for character consistency
   * Uses a reference image to maintain consistent character appearance
   */
  async generateWithIPAdapter(params: RunwareGenerationParams & {
    referenceImage: string;
    referenceWeight?: number;
  }): Promise<RunwareResponse> {
    const {
      prompt,
      negativePrompt = '',
      width = 512,
      height = 512,
      steps = 25,
      cfgScale = 7,
      seed,
      model = 'runware:100@1',
      referenceImage,
      referenceWeight = 0.6,
      removeBackground = false,
    } = params;

    const taskUUID = this.generateUUID();

    // Clean base64 prefix if present
    const cleanReferenceImage = referenceImage.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: prompt,
        negativePrompt,
        width,
        height,
        numberResults: 1,
        steps,
        CFGScale: cfgScale,
        seed: seed || Math.floor(Math.random() * 2147483647),
        model,
        outputFormat: 'PNG',
        // IP-Adapter for character consistency
        IPAdapter: [{
          model: 'runware:22@1',  // IP-Adapter Plus Face
          guideImage: cleanReferenceImage,
          weight: referenceWeight,
        }],
      }]),
    });

    const data = await response.json();

    console.log('Runware IP-Adapter response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Runware IP-Adapter error:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to generate with IP-Adapter');
    }

    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated with IP-Adapter');
    }

    let result = data.data[0];

    // Optionally remove background after generation
    if (removeBackground && result.imageURL) {
      const bgRemoved = await this.removeBackground({ imageUrl: result.imageURL });
      result.imageURL = bgRemoved;
    }

    return {
      imageURL: result.imageURL,
      seed: result.seed || seed || 0,
      positivePrompt: prompt,
      negativePrompt,
      width,
      height,
    };
  }

  /**
   * Image-to-image generation with proper seedImage parameter
   */
  async img2img(params: RunwareImg2ImgParams): Promise<RunwareResponse> {
    const {
      prompt,
      negativePrompt = '',
      seedImage,
      strength = 0.75,
      width,
      height,
      steps = 25,
      cfgScale = 7,
      seed,
      model = 'runware:100@1',
      removeBackground = false,
    } = params;

    const taskUUID = this.generateUUID();

    // Clean base64 prefix if present
    const cleanSeedImage = seedImage.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: prompt,
        negativePrompt,
        seedImage: cleanSeedImage,  // CORRECT parameter for img2img
        strength,
        width,
        height,
        numberResults: 1,
        steps,
        CFGScale: cfgScale,
        seed: seed || Math.floor(Math.random() * 2147483647),
        model,
        outputFormat: 'PNG',
      }]),
    });

    const data = await response.json();

    console.log('Runware img2img response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Runware img2img error:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to transform image');
    }

    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated from img2img');
    }

    let result = data.data[0];

    // Optionally remove background after generation
    if (removeBackground && result.imageURL) {
      const bgRemoved = await this.removeBackground({ imageUrl: result.imageURL });
      result.imageURL = bgRemoved;
    }

    return {
      imageURL: result.imageURL,
      seed: result.seed || seed || 0,
      positivePrompt: prompt,
      negativePrompt,
      width: result.width || width || 512,
      height: result.height || height || 512,
    };
  }

  /**
   * Generate sprite rotations as a single turnaround sprite sheet
   * Uses IP-Adapter to maintain character consistency across all views
   * Generates a 4-panel sprite sheet: front, side, back, side (mirrored)
   */
  async generateSpriteRotations(params: {
    sourceImage: string;  // Base64 or URL of the source sprite
    characterDescription?: string;  // Optional description to help guide generation
    width?: number;
    height?: number;
    seed?: number;
  }): Promise<{
    front: string;
    back: string;
    left: string;
    right: string;
    seed: number;
  }> {
    const {
      sourceImage,
      characterDescription = '',
      width = 64,
      height = 64,
      seed = Math.floor(Math.random() * 2147483647),
    } = params;

    // Clean base64 prefix if present
    const cleanSourceImage = sourceImage.replace(/^data:image\/\w+;base64,/, '');

    console.log('Generating sprite turnaround sheet...');
    console.log('Source image length:', cleanSourceImage.length);
    console.log('Character description:', characterDescription);

    // Generate a character turnaround sheet - all 4 views in one image
    // This is the standard approach used by CharTurner and similar tools
    const turnaroundPrompt = characterDescription
      ? `character turnaround sheet, ${characterDescription}, pixel art sprite, ((front view)), ((side view)), ((back view)), ((side view)), 4 poses in a row, same character, consistent design, game asset, white background, 16-bit style, clean pixels`
      : `character turnaround sheet, pixel art sprite, ((front view)), ((side view)), ((back view)), ((side view)), 4 poses in a row, same character, consistent design, game asset, white background, 16-bit style, clean pixels`;

    const negativePrompt = 'blurry, smooth, realistic, 3d render, photograph, gradient, anti-aliased, watermark, different characters, inconsistent, text, cropped';

    const taskUUID = this.generateUUID();

    // Generate sprite sheet at 1024x256 (4 panels side by side)
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify([{
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: turnaroundPrompt,
        negativePrompt,
        width: 1024,  // 4 panels x 256 each
        height: 256,
        numberResults: 1,
        steps: 30,
        CFGScale: 7,
        seed,
        model: 'runware:100@1',
        outputFormat: 'PNG',
        // Use IP-Adapter to maintain character from source image
        IPAdapter: [{
          model: 'runware:22@1',  // IP-Adapter Plus
          guideImage: cleanSourceImage,
          weight: 0.85,  // High weight to match source character
        }],
      }]),
    });

    const data = await response.json();
    console.log('Runware turnaround response:', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('Failed to generate turnaround:', data.errors);
      throw new Error(data.errors[0].message || 'Failed to generate turnaround sheet');
    }

    if (!data.data || data.data.length === 0) {
      throw new Error('No turnaround sheet generated');
    }

    const spriteSheetUrl = data.data[0].imageURL;
    console.log('Turnaround sheet generated:', spriteSheetUrl);

    // Now we need to split the sprite sheet into 4 individual images
    // We'll use Runware's image processing or return the sheet for client-side splitting
    // For now, let's generate individual views with strong IP-Adapter conditioning

    const results: Record<string, string> = {};
    const directions = [
      { name: 'front', prompt: 'front view, facing camera, front facing pose' },
      { name: 'right', prompt: 'right side view, right profile, facing right' },
      { name: 'back', prompt: 'back view, rear view, facing away from camera' },
      { name: 'left', prompt: 'left side view, left profile, facing left' },
    ];

    for (const direction of directions) {
      const dirTaskUUID = this.generateUUID();
      const dirPrompt = characterDescription
        ? `pixel art character sprite, ${characterDescription}, ${direction.prompt}, single character, centered, game asset, transparent background, 16-bit style, clean pixels`
        : `pixel art character sprite, ${direction.prompt}, single character, centered, game asset, transparent background, 16-bit style, clean pixels`;

      console.log(`Generating ${direction.name} view with IP-Adapter...`);

      const dirResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify([{
          taskType: 'imageInference',
          taskUUID: dirTaskUUID,
          positivePrompt: dirPrompt,
          negativePrompt: 'blurry, smooth, realistic, 3d render, multiple characters, different character, text',
          width: 512,
          height: 512,
          numberResults: 1,
          steps: 25,
          CFGScale: 7.5,
          seed,  // Same seed for consistency
          model: 'runware:100@1',
          outputFormat: 'PNG',
          // Strong IP-Adapter conditioning from source
          IPAdapter: [{
            model: 'runware:22@1',
            guideImage: cleanSourceImage,
            weight: 0.9,  // Very high weight
          }],
        }]),
      });

      const dirData = await dirResponse.json();

      if (dirData.errors && dirData.errors.length > 0) {
        console.error(`Failed to generate ${direction.name}:`, dirData.errors);
        throw new Error(dirData.errors[0].message || `Failed to generate ${direction.name} view`);
      }

      if (!dirData.data || dirData.data.length === 0) {
        throw new Error(`No image generated for ${direction.name} view`);
      }

      let imageUrl = dirData.data[0].imageURL;

      // Remove background
      try {
        imageUrl = await this.removeBackground({ imageUrl });
        console.log(`${direction.name} background removed`);
      } catch (bgError) {
        console.warn(`Background removal failed for ${direction.name}, using original`);
      }

      results[direction.name] = imageUrl;
      console.log(`${direction.name} view complete`);
    }

    return {
      front: results.front,
      back: results.back,
      left: results.left,
      right: results.right,
      seed,
    };
  }

  async inpaintPixelArt(
    prompt: string,
    imageUrl: string,
    maskUrl: string,
    options: {
      negativePrompt?: string;
      seed?: number;
      strength?: number;
    } = {}
  ): Promise<RunwareResponse> {
    // Add pixel art styling to the prompt
    const fullPrompt = `pixel art, ${prompt}, 16-bit style, clean pixels, no anti-aliasing`;
    const fullNegative = `blurry, smooth, realistic, 3d render, gradient, anti-aliased, ${options.negativePrompt || ''}`.trim();

    return this.inpaint({
      prompt: fullPrompt,
      negativePrompt: fullNegative,
      imageUrl,
      maskUrl,
      seed: options.seed,
      strength: options.strength || 0.85,
      steps: 25,
      cfgScale: 8,
    });
  }
}

// Singleton instance
let runwareClient: RunwareClient | null = null;

export function getRunwareClient(): RunwareClient {
  if (!runwareClient) {
    const apiKey = process.env.RUNWARE_API_KEY;
    if (!apiKey) {
      throw new Error('RUNWARE_API_KEY is not set');
    }
    runwareClient = new RunwareClient(apiKey);
  }
  return runwareClient;
}

// Utility to downscale image to pixel art size
export async function processToPixelArt(
  imageUrl: string,
  targetSize: number = 64
): Promise<string> {
  // This would be implemented with sharp or canvas
  // For now, return original - we'll add processing later
  return imageUrl;
}

// Animation frame prompts for different motion types
const ANIMATION_FRAME_PROMPTS: Record<string, string[]> = {
  idle: [
    'standing neutral pose',
    'slight breathing, chest expanded',
    'standing neutral pose',
    'slight breathing, chest contracted',
  ],
  walk: [
    'walking pose, left foot forward, right arm forward',
    'walking pose, feet together, passing position',
    'walking pose, right foot forward, left arm forward',
    'walking pose, feet together, passing position',
    'walking pose, left foot forward, right arm forward',
    'walking pose, feet together, passing position',
    'walking pose, right foot forward, left arm forward',
    'walking pose, feet together, passing position',
  ],
  run: [
    'running pose, left foot forward extended, right arm forward',
    'running pose, both feet off ground, mid-air',
    'running pose, right foot forward extended, left arm forward',
    'running pose, both feet off ground, mid-air',
    'running pose, left foot forward extended, right arm forward',
    'running pose, both feet off ground, mid-air',
    'running pose, right foot forward extended, left arm forward',
    'running pose, both feet off ground, mid-air',
  ],
  attack: [
    'attack windup pose, weapon raised back',
    'attack mid-swing pose, weapon moving forward',
    'attack impact pose, weapon extended forward',
    'attack follow-through pose, weapon past target',
    'attack recovery pose, returning to neutral',
    'standing ready pose',
  ],
  jump: [
    'crouch before jump, knees bent',
    'jump takeoff, legs extending',
    'mid-air pose, peak of jump',
    'falling pose, legs preparing to land',
    'landing pose, knees bent absorbing impact',
    'standing recovery pose',
  ],
};

const DIRECTION_PROMPTS: Record<string, string> = {
  right: 'facing right, side view profile',
  left: 'facing left, side view profile',
  down: 'facing forward, front view',
  up: 'facing away, back view',
};

export interface SpriteSheetParams {
  prompt: string;
  negativePrompt?: string;
  motionType: 'idle' | 'walk' | 'run' | 'attack' | 'jump';
  direction: 'left' | 'right' | 'up' | 'down';
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  seed?: number;
}

export interface SpriteSheetResult {
  frames: string[];  // Array of frame URLs
  seed: number;
}

/**
 * Generate consistent animation frames using IP-Adapter
 *
 * The key insight: Using seed + i BREAKS character consistency.
 * Instead, we generate a reference frame first, then use IP-Adapter
 * to maintain character appearance across all subsequent frames.
 */
export async function generateSpriteSheet(
  client: RunwareClient,
  params: SpriteSheetParams
): Promise<SpriteSheetResult> {
  const {
    prompt,
    negativePrompt = '',
    motionType,
    direction,
    frameCount,
    frameWidth,
    frameHeight,
    seed = Math.floor(Math.random() * 2147483647),
  } = params;

  const framePrompts = ANIMATION_FRAME_PROMPTS[motionType] || ANIMATION_FRAME_PROMPTS.idle;
  const directionPrompt = DIRECTION_PROMPTS[direction] || DIRECTION_PROMPTS.right;

  const frames: string[] = [];

  // Step 1: Generate the reference/base frame first
  const basePrompt = `pixel art character sprite, ${prompt}, ${framePrompts[0]}, ${directionPrompt}, game asset, transparent background, centered, 16-bit style, clean pixels, no anti-aliasing`;
  const fullNegative = `blurry, smooth, realistic, 3d render, photograph, gradient, anti-aliased, watermark, ${negativePrompt}`.trim();

  console.log(`Generating reference frame with seed ${seed}...`);

  const referenceResult = await client.generateImage({
    prompt: basePrompt,
    negativePrompt: fullNegative,
    width: frameWidth,
    height: frameHeight,
    seed,
    steps: 25,
    cfgScale: 8,
  });

  frames.push(referenceResult.imageURL);
  const referenceImageUrl = referenceResult.imageURL;

  // Step 2: Generate remaining frames using IP-Adapter to maintain character consistency
  for (let i = 1; i < frameCount; i++) {
    const frameIndex = i % framePrompts.length;
    const framePrompt = framePrompts[frameIndex];

    const fullPrompt = `pixel art character sprite, ${prompt}, ${framePrompt}, ${directionPrompt}, game asset, transparent background, centered, 16-bit style, clean pixels, no anti-aliasing, same character as reference`;

    console.log(`Generating frame ${i + 1}/${frameCount}: ${framePrompt} (with IP-Adapter)`);

    try {
      // Use IP-Adapter to keep character consistent with reference
      const result = await client.generateWithIPAdapter({
        prompt: fullPrompt,
        negativePrompt: fullNegative,
        width: frameWidth,
        height: frameHeight,
        seed,  // SAME seed for all frames
        steps: 25,
        cfgScale: 8,
        referenceImage: referenceImageUrl,
        referenceWeight: 0.7,  // Strong but not overpowering
      });

      frames.push(result.imageURL);
    } catch (error) {
      // Fallback: If IP-Adapter fails, try with same seed (still better than seed+i)
      console.warn(`IP-Adapter failed for frame ${i + 1}, falling back to same-seed generation`);
      const result = await client.generateImage({
        prompt: fullPrompt,
        negativePrompt: fullNegative,
        width: frameWidth,
        height: frameHeight,
        seed,  // SAME seed, not seed + i
        steps: 25,
        cfgScale: 8,
      });
      frames.push(result.imageURL);
    }
  }

  return { frames, seed };
}

// Generate a single sprite sheet image with all frames in a row
// This is the BEST approach for consistent characters
export async function generateSpriteSheetImage(
  client: RunwareClient,
  params: Omit<SpriteSheetParams, 'frameWidth' | 'frameHeight'> & { frameSize: number }
): Promise<{ imageUrl: string; seed: number; frameCount: number }> {
  const {
    prompt,
    negativePrompt = '',
    motionType,
    direction,
    frameCount,
    frameSize,
    seed,
  } = params;

  const directionPrompt = DIRECTION_PROMPTS[direction] || DIRECTION_PROMPTS.right;

  // Motion descriptions optimized for sprite sheet generation
  const motionDesc: Record<string, string> = {
    idle: 'idle animation loop, breathing, subtle movement',
    walk: 'walk cycle, walking animation, step sequence',
    run: 'run cycle, running animation, fast movement',
    attack: 'attack animation, sword swing, combat motion',
    jump: 'jump animation, jumping sequence, leap',
  };

  // Calculate dimensions - Runware needs multiples of 64, min 128
  // For sprite sheets, use 2:1 or 4:1 aspect ratio
  const width = Math.min(1024, Math.max(512, frameCount * 128));
  const height = Math.max(128, Math.round(width / frameCount));

  // Highly optimized prompt for pixel art sprite sheets
  const fullPrompt = `pixel art sprite sheet, ${frameCount} frames arranged horizontally, same character in each frame, ${prompt}, ${motionDesc[motionType]}, ${directionPrompt}, retro game sprite, 16-bit SNES style, clean pixel edges, no anti-aliasing, consistent character design throughout, each frame shows different pose of same character, game asset, transparent background, evenly spaced grid`;

  const fullNegative = `blurry, smooth, realistic, 3D, photograph, gradient, anti-aliased, different characters, inconsistent style, modern art, watermark, text, overlapping sprites, vertical arrangement, single frame, ${negativePrompt}`.trim();

  console.log(`Generating ${frameCount}-frame pixel sprite sheet: ${motionDesc[motionType]}`);
  console.log(`Dimensions: ${width}x${height}`);

  const result = await client.generateImage({
    prompt: fullPrompt,
    negativePrompt: fullNegative,
    width,
    height,
    seed: seed || Math.floor(Math.random() * 2147483647),
    steps: 35, // Higher steps for better quality
    cfgScale: 9, // Higher CFG for more prompt adherence
  });

  return {
    imageUrl: result.imageURL,
    seed: result.seed,
    frameCount,
  };
}
