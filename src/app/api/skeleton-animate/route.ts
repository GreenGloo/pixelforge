// ==========================================
// Skeleton-Guided Animation API
// Generates character animations using skeleton pose guidance
// ==========================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateSkeletonAnimation,
  generatePresetAnimation,
  isRetroDiffusionConfigured,
  PoseAnimationType,
  POSE_DESCRIPTIONS,
} from '@/lib/retrodiffusion';

// Credit cost: 1 credit per frame
function calculateCreditCost(frameCount: number): number {
  return frameCount;
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
      characterPrompt,
      animationType,
      poseDescriptions,
      poseImages,
      seed,
      width = 64,
      height = 64,
      poseStrength = 0.55,
    } = body;

    if (!characterPrompt || characterPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Character prompt is required' },
        { status: 400 }
      );
    }

    // Determine frame count and validate
    let frameCount: number;
    let descriptions: string[];

    if (animationType && animationType in POSE_DESCRIPTIONS) {
      // Using preset animation type
      descriptions = [...POSE_DESCRIPTIONS[animationType as PoseAnimationType]];
      frameCount = descriptions.length;
    } else if (poseDescriptions && Array.isArray(poseDescriptions) && poseDescriptions.length > 0) {
      // Using custom pose descriptions
      descriptions = poseDescriptions;
      frameCount = descriptions.length;
    } else {
      return NextResponse.json(
        { error: 'Either animationType or poseDescriptions must be provided' },
        { status: 400 }
      );
    }

    // Limit frame count
    if (frameCount > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 frames allowed per animation' },
        { status: 400 }
      );
    }

    // Calculate credit cost
    const cost = calculateCreditCost(frameCount);

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

    console.log('Generating skeleton-guided animation:', {
      characterPrompt,
      animationType,
      frameCount,
      hasPoseImages: !!poseImages,
    });

    // Generate the animation
    const result = await generateSkeletonAnimation(
      characterPrompt,
      descriptions,
      poseImages,
      {
        seed,
        width,
        height,
        poseStrength,
      }
    );

    // Deduct credits
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: cost } },
    });

    // Log the generation
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        prompt: characterPrompt,
        style: 'SKELETON_ANIMATION',
        width,
        height,
        status: 'COMPLETED',
        imageUrl: result.frames[0],
        cost,
        metadata: JSON.stringify({
          type: 'skeleton-animation',
          method: 'skeleton_guided',
          animationType: animationType || 'custom',
          frameCount: result.frames.length,
          seed: result.seed,
          frames: result.frames,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      frames: result.frames,
      frameCount: result.frames.length,
      seed: result.seed,
      animationType: animationType || 'custom',
      creditsUsed: cost,
      creditsRemaining: user.credits - cost,
    });
  } catch (error) {
    console.error('Skeleton animation generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate animation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to list available animation types
export async function GET() {
  return NextResponse.json({
    animationTypes: Object.keys(POSE_DESCRIPTIONS),
    descriptions: POSE_DESCRIPTIONS,
  });
}
