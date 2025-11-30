// ==========================================
// Input Validation Schemas with Zod
// ==========================================

import { z } from 'zod';

// Common validation helpers
const safeString = (maxLength: number = 1000) =>
  z.string().max(maxLength).trim();

const positiveInt = z.number().int().positive();
const positiveNumber = z.number().positive();

// Base64 image validation (with size limit)
const base64Image = z.string()
  .max(10 * 1024 * 1024) // Max 10MB base64
  .refine(
    (val) => {
      // Check if it starts with data:image or is raw base64
      if (val.startsWith('data:image/')) return true;
      // Check if it looks like base64
      return /^[A-Za-z0-9+/]+=*$/.test(val.replace(/\s/g, ''));
    },
    { message: 'Invalid base64 image format' }
  );

// Safe URL validation (prevents SSRF)
const safeImageUrl = z.string()
  .url()
  .max(2048)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Block internal/private IPs
        const hostname = parsed.hostname.toLowerCase();

        // Block localhost variants
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
          return false;
        }

        // Block private IP ranges
        const privateRanges = [
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^169\.254\./,
          /^0\./,
        ];

        if (privateRanges.some(regex => regex.test(hostname))) {
          return false;
        }

        // Block file:// and other schemes
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid or unsafe URL' }
  );

// ==========================================
// API-specific validation schemas
// ==========================================

// Registration
export const registerSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  name: safeString(100).optional(),
});

// Generation
export const generateSchema = z.object({
  prompt: safeString(500),
  negativePrompt: safeString(500).optional(),
  style: z.enum([
    'pixel-art', 'retro-8bit', 'retro-16bit', 'modern-pixel',
    'isometric', 'top-down', 'platformer', 'rpg'
  ]).default('pixel-art'),
  width: z.number().int().min(16).max(512).default(64),
  height: z.number().int().min(16).max(512).default(64),
  seed: z.number().int().optional(),
});

// Animation
export const animateSchema = z.object({
  mode: z.enum(['text-to-animation', 'image-to-animation']).default('text-to-animation'),
  prompt: safeString(500).optional(),
  negativePrompt: safeString(500).optional(),
  imageUrl: safeImageUrl.optional(),
  width: z.number().int().min(16).max(512).default(64),
  height: z.number().int().min(16).max(512).default(64),
  numFrames: z.number().int().min(4).max(24).default(8),
  fps: z.number().int().min(1).max(30).default(8),
  motionType: z.enum(['walk', 'run', 'idle', 'attack', 'jump', 'custom']).default('idle'),
  direction: z.enum(['left', 'right', 'up', 'down']).default('right'),
});

// Inpainting
export const inpaintSchema = z.object({
  imageData: base64Image,
  maskData: base64Image,
  prompt: safeString(500),
  negativePrompt: safeString(500).optional(),
  strength: z.number().min(0).max(1).default(0.8),
});

// Style Match
export const styleMatchSchema = z.object({
  sourceImageData: base64Image,
  referenceImageData: base64Image,
  prompt: safeString(500).optional(),
  styleStrength: z.number().min(0).max(1).default(0.7),
  width: z.number().int().min(16).max(512).default(64),
  height: z.number().int().min(16).max(512).default(64),
});

// Sprite Rotations
export const spriteRotationsSchema = z.object({
  imageData: base64Image,
  directions: z.union([z.literal(4), z.literal(8)]).default(4),
  style: safeString(200).optional(),
});

// Tileset Generation
export const tilesetSchema = z.object({
  theme: z.enum([
    'grass', 'water', 'stone', 'dirt', 'sand',
    'snow', 'lava', 'wood', 'brick', 'metal'
  ]),
  tileSize: z.union([z.literal(16), z.literal(32), z.literal(64)]).default(32),
  tilesetType: z.enum(['basic', 'full']).default('basic'),
  customPrompt: safeString(200).optional(),
});

// Stripe Checkout
export const checkoutSchema = z.object({
  packId: safeString(50).optional(),
  tierId: safeString(50).optional(),
}).refine(
  (data) => data.packId || data.tierId,
  { message: 'Either packId or tierId must be provided' }
);

// ==========================================
// Validation helper function
// ==========================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message
  const errors = result.error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join('; ');

  return { success: false, error: errors };
}

// ==========================================
// Sanitization utilities
// ==========================================

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Strip base64 prefix from data URL
 */
export function stripBase64Prefix(data: string): string {
  return data.replace(/^data:image\/\w+;base64,/, '');
}
