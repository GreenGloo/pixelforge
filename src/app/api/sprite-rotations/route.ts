// ==========================================
// Sprite Rotations API - Using Retro Diffusion
// Generates TRUE pixel art rotations from a source sprite
// Uses Retro Diffusion's character_turnaround style for authentic pixel art
// This is OUR solution - NOT using PixelLab
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateCharacterTurnaround,
  isRetroDiffusionConfigured
} from '@/lib/retrodiffusion';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Retro Diffusion is configured
    if (!isRetroDiffusionConfigured()) {
      return NextResponse.json(
        { error: 'Retro Diffusion API is not configured. Please add RETRO_DIFFUSION_API_KEY or RUNWARE_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      characterDescription = '',
      sourceImageUrl,  // Can be base64 data URL or HTTP URL
      width = 64,
      height = 64,
    } = body;

    // Source image is REQUIRED - we need a sprite to rotate
    if (!sourceImageUrl) {
      return NextResponse.json(
        { error: 'Source image is required for sprite rotation. Upload a sprite or use the canvas.' },
        { status: 400 }
      );
    }

    // Check user credits (3 credits for 3 rotations - front is original)
    const creditCost = 3;
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

    console.log('Starting sprite rotation generation with Retro Diffusion...');
    console.log('Source image provided:', sourceImageUrl ? 'Yes' : 'No');
    console.log('Source image type:', sourceImageUrl?.startsWith('data:') ? 'base64' : 'URL');
    console.log('Character description:', characterDescription);

    // Use Retro Diffusion for authentic pixel art rotations
    const result = await generateCharacterTurnaround(sourceImageUrl, {
      characterDescription,
      width,
      height,
    });

    // Format results for frontend
    const rotations = [
      { direction: 'front', imageUrl: result.frontUrl },
      { direction: 'right', imageUrl: result.rightUrl },
      { direction: 'back', imageUrl: result.backUrl },
      { direction: 'left', imageUrl: result.leftUrl },
    ];

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: creditCost } },
    });

    // Log the generation
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt: characterDescription || 'sprite rotation',
        style: 'ROTATION',
        width: width,
        height: height,
        status: 'COMPLETED',
        imageUrl: result.frontUrl,  // Use front as primary
        cost: creditCost,
        metadata: JSON.stringify({
          type: 'sprite_rotation',
          method: 'retro_diffusion',
          rotations: rotations.map(r => ({ direction: r.direction })),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      rotations,
      creditsUsed: creditCost,
      creditsRemaining: user.credits - creditCost,
    });
  } catch (error) {
    console.error('Sprite Rotations API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate rotations' },
      { status: 500 }
    );
  }
}
