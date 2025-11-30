// ==========================================
// Game Background Generation API
// Uses Retro Diffusion for parallax-ready pixel art backgrounds
// Supports layer-based generation (sky, far, midground, foreground, ground)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateGameBackground,
  generateParallaxBackground,
  isRetroDiffusionConfigured,
  type BackgroundTheme,
  type BackgroundLayer,
  type ColorPalette,
} from '@/lib/retrodiffusion';
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitHeaders,
} from '@/lib/rate-limit';

// Valid values for the schema
const BACKGROUND_THEMES = [
  'forest', 'dungeon', 'castle', 'city', 'desert', 'snow',
  'underwater', 'space', 'cave', 'village', 'battlefield', 'sky', 'custom'
] as const;

const BACKGROUND_LAYERS = [
  'sky', 'far', 'midground', 'foreground', 'ground'
] as const;

const COLOR_PALETTES = [
  'default', 'gameboy', 'nes', 'snes', 'pico8', 'endesga32',
  'fantasy', 'cyberpunk', 'nature', 'monochrome'
] as const;

// Schema for single layer generation
const generateBackgroundSchema = z.object({
  prompt: z.string().max(500, 'Description too long').default(''),
  theme: z.enum(BACKGROUND_THEMES).default('forest'),
  layer: z.enum(BACKGROUND_LAYERS).default('midground'),
  palette: z.enum(COLOR_PALETTES).default('default'),
  width: z.number().min(64).max(512).default(256),
  height: z.number().min(64).max(256).default(128),
  seamless: z.boolean().default(true),
});

// Schema for parallax (multi-layer) generation
const generateParallaxSchema = z.object({
  prompt: z.string().max(500, 'Description too long').default(''),
  theme: z.enum(BACKGROUND_THEMES).default('forest'),
  layers: z.array(z.enum(BACKGROUND_LAYERS)).default(['sky', 'far', 'midground', 'foreground', 'ground']),
  palette: z.enum(COLOR_PALETTES).default('default'),
  width: z.number().min(64).max(512).default(256),
  height: z.number().min(64).max(256).default(128),
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
        { error: 'Background API not configured. Set REPLICATE_API_TOKEN.' },
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
    const isParallax = body.layers !== undefined;

    // Check credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    // Parallax costs 1 credit per layer, single layer costs 1 credit
    const creditCost = isParallax ? (body.layers?.length || 5) : 1;

    if (!user || user.credits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditCost, available: user?.credits || 0 },
        { status: 402 }
      );
    }

    if (isParallax) {
      // Generate parallax background set
      const result = generateParallaxSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { prompt, theme, layers, palette, width, height } = result.data;

      // Create generation record
      const generation = await prisma.generation.create({
        data: {
          userId: session.user.id,
          prompt: prompt || theme,
          style: 'BACKGROUND_PARALLAX',
          width,
          height,
          status: 'PROCESSING',
        },
      });

      try {
        console.log('Generating parallax background:', {
          prompt,
          theme,
          layers,
          palette,
          width,
          height,
        });

        const parallaxResult = await generateParallaxBackground(prompt, {
          theme: theme as BackgroundTheme,
          palette: palette as ColorPalette,
          layers: layers as BackgroundLayer[],
          width,
          height,
        });

        // Count successfully generated layers
        const generatedLayers = Object.keys(parallaxResult.layers).filter(
          k => parallaxResult.layers[k as keyof typeof parallaxResult.layers]
        );
        const actualCost = generatedLayers.length;

        // Update generation with result
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'COMPLETED',
            imageUrl: Object.values(parallaxResult.layers)[0] || '',
            completedAt: new Date(),
            metadata: JSON.stringify({
              type: 'parallax_background',
              method: 'retro_diffusion',
              theme,
              palette,
              layers: parallaxResult.layers,
              seed: parallaxResult.seed,
            }),
          },
        });

        // Deduct credits
        await prisma.$transaction([
          prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { decrement: actualCost } },
          }),
          prisma.creditTransaction.create({
            data: {
              userId: session.user.id,
              amount: -actualCost,
              type: 'GENERATION',
              description: `Parallax Background: ${theme} (${actualCost} layers)`,
              generationId: generation.id,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          generation: {
            id: generation.id,
            layers: parallaxResult.layers,
            theme,
            palette,
            seed: parallaxResult.seed,
          },
          creditsUsed: actualCost,
          creditsRemaining: user.credits - actualCost,
        });
      } catch (genError) {
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            errorMessage: genError instanceof Error ? genError.message : 'Unknown error',
          },
        });
        throw genError;
      }
    } else {
      // Generate single background layer
      const result = generateBackgroundSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { prompt, theme, layer, palette, width, height, seamless } = result.data;

      // Create generation record
      const generation = await prisma.generation.create({
        data: {
          userId: session.user.id,
          prompt: prompt || `${theme} ${layer}`,
          style: 'BACKGROUND',
          width,
          height,
          status: 'PROCESSING',
        },
      });

      try {
        console.log('Generating single background layer:', {
          prompt,
          theme,
          layer,
          palette,
          width,
          height,
          seamless,
        });

        const bgResult = await generateGameBackground(prompt, {
          theme: theme as BackgroundTheme,
          layer: layer as BackgroundLayer,
          palette: palette as ColorPalette,
          width,
          height,
          seamless,
        });

        // Update generation with result
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'COMPLETED',
            imageUrl: bgResult.imageUrl,
            completedAt: new Date(),
            metadata: JSON.stringify({
              type: 'background',
              method: 'retro_diffusion',
              theme,
              layer,
              palette,
              seamless,
              seed: bgResult.seed,
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
              description: `Background: ${theme} ${layer}`,
              generationId: generation.id,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          generation: {
            id: generation.id,
            imageUrl: bgResult.imageUrl,
            theme,
            layer,
            palette,
            seed: bgResult.seed,
          },
          creditsRemaining: user.credits - 1,
        });
      } catch (genError) {
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            errorMessage: genError instanceof Error ? genError.message : 'Unknown error',
          },
        });
        throw genError;
      }
    }
  } catch (error) {
    console.error('Background generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate background' },
      { status: 500 }
    );
  }
}

// Get available options for the background generator
export async function GET() {
  return NextResponse.json({
    themes: BACKGROUND_THEMES.map(theme => ({
      value: theme,
      label: theme.charAt(0).toUpperCase() + theme.slice(1),
      description: getThemeDescription(theme),
    })),
    layers: BACKGROUND_LAYERS.map(layer => ({
      value: layer,
      label: getLayerLabel(layer),
      description: getLayerDescription(layer),
    })),
    palettes: COLOR_PALETTES.map(palette => ({
      value: palette,
      label: palette.charAt(0).toUpperCase() + palette.slice(1),
    })),
    defaultDimensions: {
      width: 256,
      height: 128,
    },
  });
}

function getThemeDescription(theme: string): string {
  const descriptions: Record<string, string> = {
    forest: 'Lush woodland with trees and foliage',
    dungeon: 'Dark underground with stone and torches',
    castle: 'Medieval architecture with towers',
    city: 'Urban environment with buildings',
    desert: 'Arid landscape with sand dunes',
    snow: 'Winter wonderland with ice',
    underwater: 'Ocean depths with coral',
    space: 'Cosmic scene with stars',
    cave: 'Rocky cavern with crystals',
    village: 'Peaceful rural cottages',
    battlefield: 'War-torn dramatic scene',
    sky: 'Floating islands in clouds',
    custom: 'Use your own description',
  };
  return descriptions[theme] || '';
}

function getLayerLabel(layer: string): string {
  const labels: Record<string, string> = {
    sky: 'Sky (Farthest)',
    far: 'Far Background',
    midground: 'Midground',
    foreground: 'Foreground',
    ground: 'Ground (Nearest)',
  };
  return labels[layer] || layer;
}

function getLayerDescription(layer: string): string {
  const descriptions: Record<string, string> = {
    sky: 'Clouds, sun/moon, atmospheric elements',
    far: 'Distant mountains, buildings silhouettes',
    midground: 'Trees, structures at medium distance',
    foreground: 'Detailed foliage, near objects',
    ground: 'Walking surface, platform tiles',
  };
  return descriptions[layer] || '';
}
