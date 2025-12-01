// ==========================================
// Sprite Rotations API - Using Retro Diffusion
// Generates TRUE pixel art rotations from a source sprite
// Uses Retro Diffusion's character_turnaround style for authentic pixel art
// Returns a sprite sheet that is split client-side for consistency
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
      width = 64,
      height = 64,
      rotationCount = 4,
    } = body;

    // Validate rotation count
    const validRotationCount = rotationCount === 8 ? 8 : 4;

    // Character description is REQUIRED for text-only generation
    if (!characterDescription.trim()) {
      return NextResponse.json(
        { error: 'Character description is required. Please describe your character.' },
        { status: 400 }
      );
    }

    // Check user credits (1 credit per rotation)
    const creditCost = validRotationCount;
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
    console.log('Character description:', characterDescription);
    console.log('Rotation count:', validRotationCount);

    // Use Retro Diffusion for authentic pixel art rotations
    // Text-only generation with character_turnaround style for consistency
    const result = await generateCharacterTurnaround(null, {
      characterDescription,
      width,
      height,
      rotationCount: validRotationCount as 4 | 8,
    });

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
        imageUrl: result.rotations[0]?.imageUrl || '',
        cost: creditCost,
        metadata: JSON.stringify({
          type: 'sprite_rotation',
          method: 'retro_diffusion_individual',
          rotationCount: result.rotations.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      rotations: result.rotations,
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
