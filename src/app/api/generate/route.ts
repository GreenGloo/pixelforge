// ==========================================
// Image Generation API with Pixel Art Post-Processing
// Uses Runware for base generation with optimized prompt builders
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRunwareClient, STYLE_PRESETS } from '@/lib/runware';
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import {
  buildItemPrompt,
  buildBackgroundPrompt,
  type ItemCategory,
  type EnvironmentType,
  type ItemSize,
} from '@/lib/prompts';

// Item categories for the prompt builder
const ITEM_CATEGORIES = [
  'weapon', 'armor', 'potion', 'food', 'material', 'tool', 'accessory', 'treasure', 'icon', 'custom'
] as const;

// Background themes for scene generation
const BACKGROUND_THEMES = [
  'forest', 'dungeon', 'castle', 'city', 'desert', 'snow',
  'underwater', 'space', 'cave', 'village', 'battlefield', 'sky', 'custom'
] as const;

// Pixel styles
const PIXEL_STYLES = ['8-bit', '16-bit', '32-bit', 'hd-pixel'] as const;

// Color palettes
const PALETTES = ['default', 'gameboy', 'nes', 'snes', 'pico8', 'endesga32', 'fantasy', 'cyberpunk', 'nature', 'monochrome'] as const;

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  negativePrompt: z.string().max(500).optional(),
  style: z.enum(['CHARACTER', 'ITEM', 'SCENE', 'TILE', 'ANIMATION']).default('CHARACTER'),
  // Target pixel art size - the final output resolution
  pixelSize: z.number().min(16).max(256).default(64),
  // Whether to apply pixel art post-processing
  pixelate: z.boolean().default(true),
  // Whether to remove background - defaults to true for CHARACTER and ITEM
  removeBackground: z.boolean().optional(),
  // Item-specific options
  itemCategory: z.enum(ITEM_CATEGORIES).optional(),
  itemSize: z.enum(['small', 'medium', 'large']).optional(),
  palette: z.enum(PALETTES).optional(),
  pixelStyle: z.enum(PIXEL_STYLES).optional(),
  sheetMode: z.boolean().optional(),
  // Scene-specific options
  sceneTheme: z.enum(BACKGROUND_THEMES).optional(),
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
    const result = generateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      prompt,
      negativePrompt,
      style,
      pixelSize,
      pixelate,
      removeBackground: requestedRemoveBg,
      itemCategory,
      itemSize,
      palette,
      pixelStyle,
      sheetMode,
      sceneTheme,
    } = result.data;

    // Determine if we should remove background
    // Default to true for CHARACTER and ITEM (sprites should have transparency)
    const shouldRemoveBackground = requestedRemoveBg !== undefined
      ? requestedRemoveBg
      : (style === 'CHARACTER' || style === 'ITEM');

    // Always generate at 512x512 for quality, then downscale to pixelSize
    const generationWidth = 512;
    const generationHeight = 512;

    // Build optimized prompts using the prompt builders for ITEM and SCENE styles
    let optimizedPrompt = prompt;
    let optimizedNegative = negativePrompt || '';

    if (style === 'ITEM') {
      // Use buildItemPrompt for sanitized, optimized item generation
      // Map the item category to the new ItemCategory type
      const categoryMap: Record<string, ItemCategory> = {
        weapon: 'weapon',
        armor: 'armor',
        potion: 'consumable',
        food: 'food',
        material: 'material',
        tool: 'tool',
        accessory: 'accessory',
        treasure: 'currency',
        icon: 'misc',
        custom: 'misc',
      };
      const itemResult = buildItemPrompt({
        item: prompt,
        category: categoryMap[itemCategory || 'custom'] || 'misc',
        size: (itemSize || 'medium') as ItemSize,
        orientation: 'vertical',
        isInventoryIcon: pixelSize <= 32,
        pixelStyle: (pixelStyle as '8-bit' | '16-bit' | '32-bit' | 'hd-pixel') || '16-bit',
        palette: (palette as any) || 'default',
        sheetMode: sheetMode || false,
        sheetCount: 4,
      });
      optimizedPrompt = itemResult.prompt;
      optimizedNegative = itemResult.negativePrompt + (negativePrompt ? `, ${negativePrompt}` : '');
      console.log('ITEM prompt optimized:', optimizedPrompt.substring(0, 100) + '...');
    } else if (style === 'SCENE') {
      // Use buildBackgroundPrompt for flat composition scenes
      // Map scene themes to environment types
      const environmentMap: Record<string, EnvironmentType> = {
        forest: 'forest',
        dungeon: 'dungeon',
        castle: 'castle',
        city: 'city',
        desert: 'desert',
        snow: 'snow',
        underwater: 'underwater',
        space: 'space',
        cave: 'cave',
        village: 'village',
        battlefield: 'ruins',
        sky: 'sky',
        custom: 'custom',
      };
      const sceneResult = buildBackgroundPrompt(prompt, {
        environment: environmentMap[sceneTheme || 'custom'] || 'custom',
        view: 'side-scroll',
        seamless: false,
        width: generationWidth,
        height: generationHeight,
        pixelStyle: '16-bit',
      });
      optimizedPrompt = sceneResult.prompt;
      optimizedNegative = sceneResult.negativePrompt + (negativePrompt ? `, ${negativePrompt}` : '');
      console.log('SCENE prompt optimized:', optimizedPrompt.substring(0, 100) + '...');
    }

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
        negativePrompt,
        style,
        width: pixelate ? pixelSize : generationWidth,
        height: pixelate ? pixelSize : generationHeight,
        pixelSize,
        status: 'PROCESSING',
      },
    });

    try {
      // Generate image using Runware at high resolution
      const runware = getRunwareClient();

      // For ITEM and SCENE, use the optimized prompts directly with generateImage
      // For other styles, use generatePixelArt which applies its own presets
      let runwareResult;

      if (style === 'ITEM' || style === 'SCENE') {
        // Use optimized prompts from prompt builders
        runwareResult = await runware.generateImage({
          prompt: optimizedPrompt,
          negativePrompt: optimizedNegative,
          width: generationWidth,
          height: generationHeight,
          steps: 25,
          cfgScale: 8,
        });
      } else {
        // Use Runware's built-in style presets for CHARACTER, TILE, ANIMATION
        runwareResult = await runware.generatePixelArt(prompt, style, {
          negativePrompt,
          width: generationWidth,
          height: generationHeight,
        });
      }

      // The imageUrl from Runware - client will handle pixel art conversion
      // We return the high-res image and the target pixelSize for client-side processing
      let imageUrl = runwareResult.imageURL;

      // Remove background for CHARACTER and ITEM sprites
      // This ensures sprites have transparency instead of colored backgrounds
      if (shouldRemoveBackground && imageUrl) {
        try {
          console.log('Removing background from generated sprite...');
          imageUrl = await runware.removeBackground({
            imageUrl,
            // Note: alphaMatting is not supported by Runware's current model
            postProcessMask: true,  // Smoother edges
          });
          console.log('Background removed successfully');
        } catch (bgError) {
          // Log but don't fail the whole generation
          console.warn('Background removal failed, using original image:', bgError);
        }
      }

      // Update generation with result
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          imageUrl,
          completedAt: new Date(),
          metadata: JSON.stringify({
            seed: runwareResult.seed,
            originalWidth: generationWidth,
            originalHeight: generationHeight,
            targetPixelSize: pixelSize,
            pixelate,
            backgroundRemoved: shouldRemoveBackground,
            // Track optimized prompt parameters
            itemCategory: style === 'ITEM' ? itemCategory : undefined,
            itemSize: style === 'ITEM' ? itemSize : undefined,
            sceneTheme: style === 'SCENE' ? sceneTheme : undefined,
            optimizedPrompt: style === 'ITEM' || style === 'SCENE' ? optimizedPrompt : undefined,
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
            description: `Generated: ${prompt.substring(0, 50)}...`,
            generationId: generation.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        generation: {
          id: generation.id,
          imageUrl,
          prompt,
          style,
          pixelSize,
          pixelate,
        },
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
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}

// Get generation history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const style = searchParams.get('style');

    const generations = await prisma.generation.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        ...(style ? { style: style as any } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prompt: true,
        style: true,
        imageUrl: true,
        thumbnailUrl: true,
        pixelSize: true,
        createdAt: true,
      },
    });

    const hasMore = generations.length > limit;
    const items = hasMore ? generations.slice(0, -1) : generations;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      generations: items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
