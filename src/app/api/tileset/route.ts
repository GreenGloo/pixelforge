// ==========================================
// Tileset Generation API - Using Retro Diffusion
// Generates complete tilesets for game environments
// Uses optimized prompt builder for seamless tiles
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRetroDiffusionConfigured } from '@/lib/retrodiffusion';
import { buildTilePrompt, type TileType } from '@/lib/prompts';
import Replicate from 'replicate';

// Tile types for different tileset styles - now include tile position info
const BASIC_TILES = [
  { id: 'center', name: 'Center', position: 'center tile, seamless fill texture' },
  { id: 'top', name: 'Top Edge', position: 'top edge, grass/material edge at top' },
  { id: 'bottom', name: 'Bottom Edge', position: 'bottom edge, grass/material edge at bottom' },
  { id: 'left', name: 'Left Edge', position: 'left edge, grass/material edge on left side' },
  { id: 'right', name: 'Right Edge', position: 'right edge, grass/material edge on right side' },
  { id: 'top-left', name: 'Top Left Corner', position: 'outer corner top left, two edges meeting' },
  { id: 'top-right', name: 'Top Right Corner', position: 'outer corner top right, two edges meeting' },
  { id: 'bottom-left', name: 'Bottom Left Corner', position: 'outer corner bottom left, two edges meeting' },
  { id: 'bottom-right', name: 'Bottom Right Corner', position: 'outer corner bottom right, two edges meeting' },
];

const FULL_TILES = [
  ...BASIC_TILES,
  { id: 'inner-top-left', name: 'Inner Top Left', position: 'inner corner top left, concave corner, inverted' },
  { id: 'inner-top-right', name: 'Inner Top Right', position: 'inner corner top right, concave corner, inverted' },
  { id: 'inner-bottom-left', name: 'Inner Bottom Left', position: 'inner corner bottom left, concave corner, inverted' },
  { id: 'inner-bottom-right', name: 'Inner Bottom Right', position: 'inner corner bottom right, concave corner, inverted' },
  { id: 'horizontal', name: 'Horizontal Edge', position: 'horizontal strip, edges on top and bottom' },
  { id: 'vertical', name: 'Vertical Edge', position: 'vertical strip, edges on left and right' },
  { id: 'single', name: 'Single/Island', position: 'isolated single tile, all four edges visible' },
  { id: 'cross', name: 'Cross', position: 'cross intersection, four-way connection point' },
];

// Map theme names to TileType
const THEME_TO_TILE_TYPE: Record<string, TileType> = {
  grass: 'grass',
  water: 'water',
  stone: 'stone',
  dirt: 'ground',
  sand: 'sand',
  snow: 'snow',
  lava: 'lava',
  wood: 'wood',
  brick: 'brick',
  metal: 'metal',
  ice: 'ice',
  dungeon: 'dungeon',
  'sci-fi': 'sci-fi',
};

// Helper to convert Replicate output to URL
function toImageUrl(output: unknown): string {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first && typeof first === 'object') {
      const str = String(first);
      if (str.startsWith('http')) {
        return str;
      }
    }
  }
  if (output && typeof output === 'object') {
    const str = String(output);
    if (str.startsWith('http')) {
      return str;
    }
  }
  throw new Error('Unexpected output format from Replicate');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Retro Diffusion is configured
    if (!isRetroDiffusionConfigured()) {
      return NextResponse.json(
        { error: 'Tileset API not configured. Set REPLICATE_API_TOKEN.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      theme = 'grass', // grass, water, stone, dirt, sand, etc.
      customPrompt = '',
      tileSize = 32, // 16, 32, or 64
      tilesetType = 'basic', // basic (9 tiles) or full (17 tiles)
    } = body;

    const tileTypes = tilesetType === 'full' ? FULL_TILES : BASIC_TILES;
    const creditCost = tileTypes.length;

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user || user.credits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditCost, available: user?.credits || 0 },
        { status: 402 }
      );
    }

    // Get the tile type for the prompt builder
    const tileType: TileType = THEME_TO_TILE_TYPE[theme] || 'custom';

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const results: { id: string; name: string; imageUrl: string }[] = [];
    const baseSeed = Math.floor(Math.random() * 2147483647);

    console.log('Generating tileset with optimized prompts:', {
      theme,
      tileType,
      tileSize,
      tilesetType,
      tileCount: tileTypes.length,
    });

    // Generate each tile type using the prompt builder
    for (let i = 0; i < tileTypes.length; i++) {
      const tile = tileTypes[i];

      // Build optimized prompt with sanitization and negative prompts
      const promptResult = buildTilePrompt(
        `${customPrompt ? customPrompt + ', ' : ''}${tile.position}`,
        {
          tileType,
          view: 'top-down',
          seamless: true,
          size: tileSize,
          pixelStyle: '16-bit',
        }
      );

      console.log(`Tile ${tile.id} prompt:`, promptResult.prompt.substring(0, 100) + '...');

      try {
        const output = await replicate.run(
          'retro-diffusion/rd-plus' as `${string}/${string}`,
          {
            input: {
              prompt: promptResult.prompt,
              negative_prompt: promptResult.negativePrompt,
              style: promptResult.style,
              width: tileSize,
              height: tileSize,
              remove_bg: false, // Tiles must keep their backgrounds
              num_images: 1,
              seed: baseSeed + i, // Consistent seed variation for cohesive set
            },
          }
        );

        const imageUrl = toImageUrl(output);
        results.push({
          id: tile.id,
          name: tile.name,
          imageUrl,
        });

        console.log(`Generated tile ${i + 1}/${tileTypes.length}: ${tile.id}`);
      } catch (error) {
        console.error(`Error generating ${tile.id}:`, error);
        // Continue with other tiles
      }
    }

    if (results.length === 0) {
      throw new Error('Failed to generate any tiles');
    }

    // Deduct credits
    const actualCost = results.length;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: actualCost } },
    });

    // Log the generation
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt: customPrompt || theme,
        style: 'TILESET',
        width: tileSize,
        height: tileSize,
        status: 'COMPLETED',
        imageUrl: results[0]?.imageUrl || '',
        cost: actualCost,
        metadata: JSON.stringify({
          type: 'tileset',
          method: 'retro_diffusion',
          theme,
          tileSize,
          tilesetType,
          generatedCount: results.length,
          baseSeed,
          tiles: results,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      tiles: results,
      tileSize,
      theme,
      tilesetType,
      creditsUsed: actualCost,
      creditsRemaining: user.credits - actualCost,
    });
  } catch (error) {
    console.error('Tileset API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tileset' },
      { status: 500 }
    );
  }
}
