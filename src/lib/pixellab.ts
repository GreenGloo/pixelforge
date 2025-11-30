// ==========================================
// PixelLab API Client
// Specialized for pixel art sprite operations
// https://api.pixellab.ai
// ==========================================

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1';

// Direction types supported by PixelLab
export type Direction =
  | 'south'      // Front (facing camera)
  | 'north'      // Back
  | 'east'       // Right
  | 'west'       // Left
  | 'south-east' // Front-right
  | 'south-west' // Front-left
  | 'north-east' // Back-right
  | 'north-west';// Back-left

export type CameraView = 'side' | 'low top-down' | 'high top-down';

export interface RotateRequest {
  from_image: string;  // Base64 image (without data:image/png;base64, prefix)
  image_size: { width: number; height: number };
  from_direction: Direction;
  to_direction: Direction;
  from_view?: CameraView;
  to_view?: CameraView;
  image_guidance_scale?: number;  // 1.0-20.0, default 3.0
  no_background?: boolean;
}

export interface RotateResponse {
  image: string;  // Base64 encoded PNG
  cost: number;
}

export interface SpriteRotationResult {
  frontUrl: string;
  rightUrl: string;
  backUrl: string;
  leftUrl: string;
}

function getPixelLabApiKey(): string | undefined {
  return process.env.PIXELLAB_API_KEY;
}

export function isPixelLabConfigured(): boolean {
  return !!getPixelLabApiKey();
}

/**
 * Call the PixelLab rotate endpoint
 */
async function rotateSprite(request: RotateRequest): Promise<string> {
  const apiKey = getPixelLabApiKey();
  if (!apiKey) {
    throw new Error('PIXELLAB_API_KEY not configured');
  }

  const response = await fetch(`${PIXELLAB_API_URL}/rotate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from_image: request.from_image,
      image_size: request.image_size,
      from_direction: request.from_direction,
      to_direction: request.to_direction,
      from_view: request.from_view || 'side',
      to_view: request.to_view || 'side',
      image_guidance_scale: request.image_guidance_scale || 5.0,  // Higher for better fidelity
      no_background: request.no_background ?? true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PixelLab rotate error:', errorText);
    throw new Error(`PixelLab rotate failed: ${response.status} - ${errorText}`);
  }

  const result: RotateResponse = await response.json();
  return result.image;
}

/**
 * Extract base64 data from a data URL or return as-is if already base64
 */
function extractBase64(imageData: string): string {
  if (imageData.startsWith('data:image/')) {
    // Extract the base64 part after the comma
    const base64Part = imageData.split(',')[1];
    return base64Part || imageData;
  }
  return imageData;
}

/**
 * Convert base64 to a data URL for the frontend
 */
function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) {
    return base64;
  }
  return `data:image/png;base64,${base64}`;
}

/**
 * Generate all 4 rotations (front, right, back, left) from a source sprite
 * Assumes the source is front-facing (south)
 */
export async function generateSpriteRotations(
  sourceImageData: string,
  options?: {
    width?: number;
    height?: number;
    sourceDirection?: Direction;
    cameraView?: CameraView;
  }
): Promise<SpriteRotationResult> {
  const width = options?.width || 64;
  const height = options?.height || 64;
  const sourceDirection = options?.sourceDirection || 'south';  // Front-facing
  const cameraView = options?.cameraView || 'side';

  // Extract base64 from the source image
  const fromImage = extractBase64(sourceImageData);

  console.log('Generating sprite rotations with PixelLab...');
  console.log('Source direction:', sourceDirection);
  console.log('Image size:', width, 'x', height);

  // Generate each direction in parallel
  const rotationPromises = [
    // Right (east)
    rotateSprite({
      from_image: fromImage,
      image_size: { width, height },
      from_direction: sourceDirection,
      to_direction: 'east',
      from_view: cameraView,
      to_view: cameraView,
      no_background: true,
    }),
    // Back (north)
    rotateSprite({
      from_image: fromImage,
      image_size: { width, height },
      from_direction: sourceDirection,
      to_direction: 'north',
      from_view: cameraView,
      to_view: cameraView,
      no_background: true,
    }),
    // Left (west)
    rotateSprite({
      from_image: fromImage,
      image_size: { width, height },
      from_direction: sourceDirection,
      to_direction: 'west',
      from_view: cameraView,
      to_view: cameraView,
      no_background: true,
    }),
  ];

  try {
    const [rightBase64, backBase64, leftBase64] = await Promise.all(rotationPromises);

    console.log('All rotations generated successfully');

    return {
      frontUrl: toDataUrl(fromImage),  // Original is the front
      rightUrl: toDataUrl(rightBase64),
      backUrl: toDataUrl(backBase64),
      leftUrl: toDataUrl(leftBase64),
    };
  } catch (error) {
    console.error('Failed to generate rotations:', error);
    throw error;
  }
}

/**
 * Generate 8 directional rotations for isometric or top-down games
 */
export async function generate8DirectionRotations(
  sourceImageData: string,
  options?: {
    width?: number;
    height?: number;
    sourceDirection?: Direction;
    cameraView?: CameraView;
  }
): Promise<Record<Direction, string>> {
  const width = options?.width || 64;
  const height = options?.height || 64;
  const sourceDirection = options?.sourceDirection || 'south';
  const cameraView = options?.cameraView || 'side';

  const fromImage = extractBase64(sourceImageData);

  const directions: Direction[] = [
    'south', 'south-east', 'east', 'north-east',
    'north', 'north-west', 'west', 'south-west',
  ];

  // Filter out the source direction since we already have it
  const directionsToGenerate = directions.filter(d => d !== sourceDirection);

  console.log(`Generating 8-direction rotations with PixelLab...`);

  const rotationPromises = directionsToGenerate.map(toDirection =>
    rotateSprite({
      from_image: fromImage,
      image_size: { width, height },
      from_direction: sourceDirection,
      to_direction: toDirection,
      from_view: cameraView,
      to_view: cameraView,
      no_background: true,
    }).then(base64 => ({ direction: toDirection, base64 }))
  );

  const results = await Promise.all(rotationPromises);

  const rotations: Record<string, string> = {
    [sourceDirection]: toDataUrl(fromImage),  // Original
  };

  for (const result of results) {
    rotations[result.direction] = toDataUrl(result.base64);
  }

  return rotations as Record<Direction, string>;
}
