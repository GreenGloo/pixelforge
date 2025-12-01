// ==========================================
// Sprite Sheet Animation API
// Generates pixel art sprite sheets using Retro Diffusion
// Uses rd-animation for walking cycles, rd-plus for other animations
// ==========================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateWalkingAnimation,
  generateAnimationFrames,
  isRetroDiffusionConfigured,
} from '@/lib/retrodiffusion';

// Credit cost: 2 credits for sprite sheet
function calculateCreditCost(): number {
  return 2;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Retro Diffusion is configured
    if (!isRetroDiffusionConfigured()) {
      return NextResponse.json(
        { error: 'Animation API not configured. Set REPLICATE_API_TOKEN.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      numFrames = 4,
      motionType = 'walk',
      direction = 'right',
    } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Calculate credit cost
    const cost = calculateCreditCost();

    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.credits < cost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: cost, available: user?.credits || 0 },
        { status: 402 }
      );
    }

    // Direction mapping for prompt enhancement
    const directionPrompts: Record<string, string> = {
      right: 'side view facing right',
      left: 'side view facing left',
      down: 'front view facing camera',
      up: 'back view facing away',
    };

    console.log('Generating animation with Retro Diffusion:', {
      prompt,
      motionType,
      numFrames,
      direction,
    });

    let result;
    let frameCount = 4;
    let directions = 1;

    // Use rd-animation for walking (gives 4 directions x 4 frames sprite sheet)
    if (motionType === 'walk') {
      const walkResult = await generateWalkingAnimation(prompt);
      result = {
        spriteSheetUrl: walkResult.spriteSheetUrl,
        seed: walkResult.seed,
      };
      frameCount = walkResult.frameCount;
      directions = walkResult.directions;
    } else {
      // Use rd-plus for other animation types (generates individual frames)
      // Include direction in the prompt for non-walk animations
      const directionDesc = directionPrompts[direction] || directionPrompts.right;
      const enhancedPrompt = `${prompt}, ${directionDesc}`;

      const framesResult = await generateAnimationFrames(enhancedPrompt, {
        motionType: motionType as 'idle' | 'walk' | 'run' | 'attack' | 'jump',
        frameCount: Math.min(numFrames, 4),
        width: 64,
        height: 64,
      });

      // Return the first frame as the "sprite sheet" for now
      // The frontend can display individual frames
      result = {
        spriteSheetUrl: framesResult.frames[0],
        frames: framesResult.frames,
        seed: framesResult.seed,
      };
      frameCount = framesResult.frames.length;
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: cost } },
    });

    // Log the generation
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt,
        style: 'ANIMATION',
        width: motionType === 'walk' ? 192 : 64,  // rd-animation is 48x48 * 4
        height: motionType === 'walk' ? 192 : 64,
        status: 'COMPLETED',
        imageUrl: result.spriteSheetUrl,
        cost,
        metadata: JSON.stringify({
          type: 'sprite-sheet',
          method: 'retro_diffusion',
          motionType,
          frameCount,
          directions,
          seed: result.seed,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      spriteSheetUrl: result.spriteSheetUrl,
      frames: 'frames' in result ? result.frames : undefined,
      frameCount,
      directions,
      seed: result.seed,
      creditsUsed: cost,
      creditsRemaining: user.credits - cost,
    });
  } catch (error) {
    console.error('Animation generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate animation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
