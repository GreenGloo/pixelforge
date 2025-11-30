// ==========================================
// Style Match API - Using Retro Diffusion
// Generates pixel art matching the style of a reference image
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateGameSprite,
  isRetroDiffusionConfigured,
  type RetroDiffusionStyle,
} from '@/lib/retrodiffusion';
import Replicate from 'replicate';

// Helper to extract base64 from data URL
function extractBase64(imageData: string): string {
  if (imageData.startsWith('data:image/')) {
    const base64Part = imageData.split(',')[1];
    return base64Part || imageData;
  }
  return imageData;
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Retro Diffusion is configured
    if (!isRetroDiffusionConfigured()) {
      return NextResponse.json(
        { error: 'Style Match API not configured. Set REPLICATE_API_TOKEN.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      prompt,
      referenceImageUrl,
      styleStrength = 0.7,
      width = 64,
      height = 64,
      style = 'default',
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    const creditCost = referenceImageUrl ? 2 : 1; // Style matching costs more

    if (!user || user.credits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditCost, available: user?.credits || 0 },
        { status: 402 }
      );
    }

    const seed = Math.floor(Math.random() * 2147483647);
    let imageUrl: string;

    // If there's a reference image, use img2img with Retro Diffusion
    if (referenceImageUrl) {
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

      // Prepare the image input
      const base64 = extractBase64(referenceImageUrl);
      const inputImage = referenceImageUrl.startsWith('data:')
        ? referenceImageUrl
        : `data:image/png;base64,${base64}`;

      console.log('Style Match with reference:', {
        prompt,
        styleStrength,
        width,
        height,
        style,
      });

      const output = await replicate.run(
        'retro-diffusion/rd-plus' as `${string}/${string}`,
        {
          input: {
            prompt: `pixel art, ${prompt}, game sprite, clean pixels`,
            style: style as RetroDiffusionStyle,
            width,
            height,
            input_image: inputImage,
            strength: 1 - styleStrength, // Lower strength = more like reference
            remove_bg: true,
            num_images: 1,
            seed,
          },
        }
      );

      imageUrl = toImageUrl(output);
    } else {
      // No reference - just generate with Retro Diffusion
      const result = await generateGameSprite(prompt, {
        size: Math.min(width, height) as 16 | 32 | 48 | 64 | 96 | 128,
        style: style as RetroDiffusionStyle,
        seed,
        removeBackground: true,
      });
      imageUrl = result.imageUrl;
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
        style: 'STYLE_MATCH',
        width,
        height,
        status: 'COMPLETED',
        imageUrl,
        cost: creditCost,
        metadata: JSON.stringify({
          type: 'style_match',
          method: 'retro_diffusion',
          hasReference: !!referenceImageUrl,
          styleStrength,
          seed,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      seed,
      creditsRemaining: user.credits - creditCost,
    });
  } catch (error) {
    console.error('Style Match API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
