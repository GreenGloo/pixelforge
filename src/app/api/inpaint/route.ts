// ==========================================
// Inpaint API - Multi-Model Pixel Art Inpainting
// Supports multiple inpainting approaches:
// 1. flux-2d-game-assets: Native mask inpainting for game assets (best for pixel art)
// 2. flux-fill-dev: High quality general inpainting
// 3. retro-diffusion: Hybrid approach with preprocessing (fallback)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Replicate from 'replicate';

// Inpainting model options
type InpaintModel = 'flux-game' | 'flux-fill' | 'retro-diffusion';

function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

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

// Inpaint using flux-2d-game-assets (native mask support for pixel art)
async function inpaintWithFluxGame(
  replicate: Replicate,
  params: {
    prompt: string;
    imageData: string;
    maskData: string;
    width: number;
    height: number;
    seed: number;
  }
): Promise<string> {
  const { prompt, imageData, maskData, width, height, seed } = params;

  console.log('Inpainting with flux-2d-game-assets (native mask)...');

  const output = await replicate.run(
    'replicate/flux-2d-game-assets' as `${string}/${string}`,
    {
      input: {
        prompt: `pixel art game sprite, ${prompt}, clean pixels, game asset`,
        image: imageData,
        mask: maskData, // White = inpaint, Black = keep
        width: Math.min(Math.max(width, 256), 1024),
        height: Math.min(Math.max(height, 256), 1024),
        output_format: 'png',
        seed,
      },
    }
  );

  return toImageUrl(output);
}

// Inpaint using flux-fill-dev (high quality general inpainting)
async function inpaintWithFluxFill(
  replicate: Replicate,
  params: {
    prompt: string;
    imageData: string;
    maskData: string;
    width: number;
    height: number;
    seed: number;
    guidance?: number;
  }
): Promise<string> {
  const { prompt, imageData, maskData, width, height, seed, guidance = 30 } = params;

  console.log('Inpainting with flux-fill-dev...');

  const output = await replicate.run(
    'black-forest-labs/flux-fill-dev' as `${string}/${string}`,
    {
      input: {
        prompt: `pixel art, ${prompt}, clean pixel art style, game sprite`,
        image: imageData,
        mask: maskData, // White = inpaint, Black = preserve
        guidance,
        steps: 28,
        seed,
      },
    }
  );

  return toImageUrl(output);
}

// Inpaint using retro-diffusion img2img (hybrid approach)
async function inpaintWithRetroDiffusion(
  replicate: Replicate,
  params: {
    prompt: string;
    imageData: string;
    width: number;
    height: number;
    strength: number;
    style: string;
    seed: number;
  }
): Promise<string> {
  const { prompt, imageData, width, height, strength, style, seed } = params;

  console.log('Inpainting with Retro Diffusion (hybrid approach)...');

  const output = await replicate.run(
    'retro-diffusion/rd-plus' as `${string}/${string}`,
    {
      input: {
        prompt: `${prompt}, pixel art, game sprite, clean pixels`,
        style,
        width: Math.min(Math.max(width, 16), 384),
        height: Math.min(Math.max(height, 16), 384),
        input_image: imageData,
        strength,
        remove_bg: false,
        num_images: 1,
        seed,
      },
    }
  );

  return toImageUrl(output);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isReplicateConfigured()) {
      return NextResponse.json(
        { error: 'Inpaint API not configured. Set REPLICATE_API_TOKEN.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      prompt,
      imageData,
      maskData,
      width = 64,
      height = 64,
      strength = 0.85,
      style = 'default',
      model = 'flux-fill' as InpaintModel, // Default to flux-fill for best quality
      guidance = 30, // For flux-fill
    } = body;

    if (!prompt || !imageData || !maskData) {
      return NextResponse.json(
        { error: 'Prompt, imageData, and maskData are required' },
        { status: 400 }
      );
    }

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    const creditCost = 2; // Inpainting costs 2 credits

    if (!user || user.credits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditCost, available: user?.credits || 0 },
        { status: 402 }
      );
    }

    // Ensure images are in proper data URL format
    const inputImage = imageData.startsWith('data:')
      ? imageData
      : `data:image/png;base64,${imageData}`;

    const inputMask = maskData.startsWith('data:')
      ? maskData
      : `data:image/png;base64,${maskData}`;

    const seed = Math.floor(Math.random() * 2147483647);
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    console.log('Inpainting request:', {
      prompt,
      width,
      height,
      model,
      strength,
      style,
    });

    let imageUrl: string;
    let methodUsed = model;

    try {
      switch (model) {
        case 'flux-game':
          imageUrl = await inpaintWithFluxGame(replicate, {
            prompt,
            imageData: inputImage,
            maskData: inputMask,
            width,
            height,
            seed,
          });
          break;

        case 'flux-fill':
          imageUrl = await inpaintWithFluxFill(replicate, {
            prompt,
            imageData: inputImage,
            maskData: inputMask,
            width,
            height,
            seed,
            guidance,
          });
          break;

        case 'retro-diffusion':
        default:
          imageUrl = await inpaintWithRetroDiffusion(replicate, {
            prompt,
            imageData: inputImage,
            width,
            height,
            strength,
            style,
            seed,
          });
          break;
      }
    } catch (modelError) {
      // If the selected model fails, fallback to retro-diffusion
      console.warn(`${model} failed, falling back to retro-diffusion:`, modelError);
      methodUsed = 'retro-diffusion';
      imageUrl = await inpaintWithRetroDiffusion(replicate, {
        prompt,
        imageData: inputImage,
        width,
        height,
        strength,
        style,
        seed,
      });
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: creditCost } },
    });

    // Log the generation
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt,
        style: 'INPAINT',
        width,
        height,
        status: 'COMPLETED',
        imageUrl,
        cost: creditCost,
        metadata: JSON.stringify({
          type: 'inpaint',
          method: methodUsed,
          requestedModel: model,
          strength,
          style,
          guidance,
          seed,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      seed,
      width,
      height,
      model: methodUsed,
      creditsRemaining: user.credits - creditCost,
    });
  } catch (error) {
    console.error('Inpaint API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to inpaint image' },
      { status: 500 }
    );
  }
}
