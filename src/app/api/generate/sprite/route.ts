// ==========================================
// Game Sprite Generation API
// Uses Retro Diffusion for optimized pixel art sprites
// Supports pose presets, color palettes, and proper framing
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateGameSprite,
  isRetroDiffusionConfigured,
  type PosePreset,
  type ColorPalette,
  type SpriteSize,
  type RetroDiffusionStyle,
} from '@/lib/retrodiffusion';
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitHeaders,
} from '@/lib/rate-limit';

// Valid values for the schema
const POSE_PRESETS = [
  'idle_front', 'idle_side', 'walk_cycle', 'run_cycle',
  'attack_melee', 'attack_ranged', 'jump', 'crouch', 'death', 'hurt'
] as const;

const COLOR_PALETTES = [
  'default', 'gameboy', 'nes', 'snes', 'pico8', 'endesga32',
  'fantasy', 'cyberpunk', 'nature', 'monochrome'
] as const;

const SPRITE_SIZES = [16, 32, 48, 64, 96, 128] as const;

const STYLES = [
  'default', 'retro', 'watercolor', 'textured', 'cartoon',
  'ui_element', 'item_sheet', 'character_turnaround', 'environment',
  'isometric', 'isometric_asset', 'topdown_map', 'topdown_asset',
  'classic', 'topdown_item', 'low_res', 'mc_item', 'mc_texture', 'skill_icon'
] as const;

const generateSpriteSchema = z.object({
  prompt: z.string().min(1, 'Character description is required').max(500, 'Description too long'),
  pose: z.enum(POSE_PRESETS).optional(),
  palette: z.enum(COLOR_PALETTES).default('default'),
  size: z.number().refine((n): n is SpriteSize => SPRITE_SIZES.includes(n as SpriteSize), {
    message: 'Size must be 16, 32, 48, 64, 96, or 128'
  }).default(64),
  style: z.enum(STYLES).default('default'),
  removeBackground: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Retro Diffusion is configured
    if (!isRetroDiffusionConfigured()) {
      return NextResponse.json(
        { error: 'Sprite API not configured. Set REPLICATE_API_TOKEN.' },
        { status: 500 }
      );
    }

    // Rate limiting per user
    const rateLimitResult = checkRateLimit(
      `generate:${session.user.id}`,
      RATE_LIMITS.generation
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const result = generateSpriteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { prompt, pose, palette, size, style, removeBackground } = result.data;

    // Check credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user || user.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt,
        style: 'CHARACTER',
        width: size,
        height: size,
        pixelSize: size,
        status: 'PROCESSING',
      },
    });

    try {
      console.log('Generating game sprite:', {
        prompt,
        pose,
        palette,
        size,
        style,
        removeBackground,
      });

      // Generate sprite using Retro Diffusion with optimized prompts
      const spriteResult = await generateGameSprite(prompt, {
        pose: pose as PosePreset,
        palette: palette as ColorPalette,
        size: size as SpriteSize,
        style: style as RetroDiffusionStyle,
        removeBackground,
      });

      // Update generation with result
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          imageUrl: spriteResult.imageUrl,
          completedAt: new Date(),
          metadata: JSON.stringify({
            seed: spriteResult.seed,
            method: 'retro_diffusion',
            pose,
            palette,
            style,
            size,
            removeBackground,
          }),
        },
      });

      // Deduct credit
      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { decrement: 1 } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: session.user.id,
            amount: -1,
            type: 'GENERATION',
            description: `Game Sprite: ${prompt.substring(0, 50)}...`,
            generationId: generation.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        generation: {
          id: generation.id,
          imageUrl: spriteResult.imageUrl,
          prompt,
          pose,
          palette,
          size,
          style,
          seed: spriteResult.seed,
        },
        creditsRemaining: user.credits - 1,
      });
    } catch (genError) {
      // Mark generation as failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          errorMessage: genError instanceof Error ? genError.message : 'Unknown error',
        },
      });

      throw genError;
    }
  } catch (error) {
    console.error('Sprite generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate sprite' },
      { status: 500 }
    );
  }
}

// Get available options for the sprite generator
export async function GET() {
  return NextResponse.json({
    poses: POSE_PRESETS.map(pose => ({
      value: pose,
      label: pose.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    })),
    palettes: COLOR_PALETTES.map(palette => ({
      value: palette,
      label: palette.charAt(0).toUpperCase() + palette.slice(1),
    })),
    sizes: SPRITE_SIZES,
    styles: STYLES.map(style => ({
      value: style,
      label: style.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    })),
  });
}
