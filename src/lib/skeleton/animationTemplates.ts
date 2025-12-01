// ==========================================
// Pre-built Animation Templates for Skeleton System
// These provide ready-to-use walk, run, attack, idle, and jump cycles
// ==========================================

import { AnimationKeyframe, BoneTransform, SkeletalAnimation } from './types';

// Helper to create a transform with defaults
function t(rotation: number, x: number = 0, y: number = 0): BoneTransform {
  return { rotation, x, y, scaleX: 1, scaleY: 1 };
}

// Bone names used in humanoid skeleton
const BONES = {
  root: 'root',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  shoulder_L: 'shoulder_L',
  upper_arm_L: 'upper_arm_L',
  lower_arm_L: 'lower_arm_L',
  hand_L: 'hand_L',
  shoulder_R: 'shoulder_R',
  upper_arm_R: 'upper_arm_R',
  lower_arm_R: 'lower_arm_R',
  hand_R: 'hand_R',
  hip_L: 'hip_L',
  upper_leg_L: 'upper_leg_L',
  lower_leg_L: 'lower_leg_L',
  foot_L: 'foot_L',
  hip_R: 'hip_R',
  upper_leg_R: 'upper_leg_R',
  lower_leg_R: 'lower_leg_R',
  foot_R: 'foot_R',
};

// ==========================================
// IDLE ANIMATION - Subtle breathing motion
// ==========================================
export const IDLE_ANIMATION: Omit<SkeletalAnimation, 'id'> = {
  name: 'Idle',
  duration: 1000,
  loop: true,
  keyframes: [
    {
      time: 0,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(5),
        [BONES.upper_arm_R]: t(-5),
        [BONES.upper_leg_L]: t(0),
        [BONES.upper_leg_R]: t(0),
      },
    },
    {
      time: 500,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, -1), // Slight rise
        [BONES.spine]: t(-2),
        [BONES.chest]: t(-2),
        [BONES.head]: t(2),
        [BONES.upper_arm_L]: t(8),
        [BONES.upper_arm_R]: t(-8),
        [BONES.upper_leg_L]: t(0),
        [BONES.upper_leg_R]: t(0),
      },
    },
    {
      time: 1000,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(5),
        [BONES.upper_arm_R]: t(-5),
        [BONES.upper_leg_L]: t(0),
        [BONES.upper_leg_R]: t(0),
      },
    },
  ],
};

// ==========================================
// WALK ANIMATION - 4-frame walk cycle
// ==========================================
export const WALK_ANIMATION: Omit<SkeletalAnimation, 'id'> = {
  name: 'Walk',
  duration: 800,
  loop: true,
  keyframes: [
    // Frame 1: Contact - Right foot forward
    {
      time: 0,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(3),
        [BONES.chest]: t(-3),
        [BONES.head]: t(0),
        // Arms swing opposite to legs
        [BONES.upper_arm_L]: t(-30),
        [BONES.lower_arm_L]: t(-15),
        [BONES.upper_arm_R]: t(30),
        [BONES.lower_arm_R]: t(15),
        // Right leg forward, left leg back
        [BONES.upper_leg_L]: t(30),
        [BONES.lower_leg_L]: t(10),
        [BONES.foot_L]: t(-5),
        [BONES.upper_leg_R]: t(-25),
        [BONES.lower_leg_R]: t(35),
        [BONES.foot_R]: t(0),
      },
    },
    // Frame 2: Passing - Legs together
    {
      time: 200,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 2), // Slight dip
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(0),
        [BONES.lower_arm_L]: t(-10),
        [BONES.upper_arm_R]: t(0),
        [BONES.lower_arm_R]: t(-10),
        [BONES.upper_leg_L]: t(0),
        [BONES.lower_leg_L]: t(25),
        [BONES.foot_L]: t(0),
        [BONES.upper_leg_R]: t(0),
        [BONES.lower_leg_R]: t(0),
        [BONES.foot_R]: t(0),
      },
    },
    // Frame 3: Contact - Left foot forward
    {
      time: 400,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(-3),
        [BONES.chest]: t(3),
        [BONES.head]: t(0),
        // Arms swing opposite
        [BONES.upper_arm_L]: t(30),
        [BONES.lower_arm_L]: t(15),
        [BONES.upper_arm_R]: t(-30),
        [BONES.lower_arm_R]: t(-15),
        // Left leg forward, right leg back
        [BONES.upper_leg_L]: t(-25),
        [BONES.lower_leg_L]: t(35),
        [BONES.foot_L]: t(0),
        [BONES.upper_leg_R]: t(30),
        [BONES.lower_leg_R]: t(10),
        [BONES.foot_R]: t(-5),
      },
    },
    // Frame 4: Passing - Legs together (return)
    {
      time: 600,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 2),
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(0),
        [BONES.lower_arm_L]: t(-10),
        [BONES.upper_arm_R]: t(0),
        [BONES.lower_arm_R]: t(-10),
        [BONES.upper_leg_L]: t(0),
        [BONES.lower_leg_L]: t(0),
        [BONES.foot_L]: t(0),
        [BONES.upper_leg_R]: t(0),
        [BONES.lower_leg_R]: t(25),
        [BONES.foot_R]: t(0),
      },
    },
    // Loop back to frame 1
    {
      time: 800,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(3),
        [BONES.chest]: t(-3),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(-30),
        [BONES.lower_arm_L]: t(-15),
        [BONES.upper_arm_R]: t(30),
        [BONES.lower_arm_R]: t(15),
        [BONES.upper_leg_L]: t(30),
        [BONES.lower_leg_L]: t(10),
        [BONES.foot_L]: t(-5),
        [BONES.upper_leg_R]: t(-25),
        [BONES.lower_leg_R]: t(35),
        [BONES.foot_R]: t(0),
      },
    },
  ],
};

// ==========================================
// RUN ANIMATION - Faster, more dynamic
// ==========================================
export const RUN_ANIMATION: Omit<SkeletalAnimation, 'id'> = {
  name: 'Run',
  duration: 500,
  loop: true,
  keyframes: [
    // Frame 1: Push off - Right foot back
    {
      time: 0,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(10, 0, 0), // Lean forward
        [BONES.spine]: t(5),
        [BONES.chest]: t(-5),
        [BONES.head]: t(-5),
        [BONES.upper_arm_L]: t(-50),
        [BONES.lower_arm_L]: t(-60),
        [BONES.upper_arm_R]: t(50),
        [BONES.lower_arm_R]: t(-30),
        [BONES.upper_leg_L]: t(50),
        [BONES.lower_leg_L]: t(-10),
        [BONES.foot_L]: t(-10),
        [BONES.upper_leg_R]: t(-40),
        [BONES.lower_leg_R]: t(60),
        [BONES.foot_R]: t(10),
      },
    },
    // Frame 2: Flight phase
    {
      time: 125,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(8, 0, -3), // Rise up
        [BONES.spine]: t(3),
        [BONES.chest]: t(-3),
        [BONES.head]: t(-3),
        [BONES.upper_arm_L]: t(-20),
        [BONES.lower_arm_L]: t(-45),
        [BONES.upper_arm_R]: t(20),
        [BONES.lower_arm_R]: t(-45),
        [BONES.upper_leg_L]: t(20),
        [BONES.lower_leg_L]: t(30),
        [BONES.foot_L]: t(0),
        [BONES.upper_leg_R]: t(-20),
        [BONES.lower_leg_R]: t(30),
        [BONES.foot_R]: t(0),
      },
    },
    // Frame 3: Land - Left foot forward
    {
      time: 250,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(10, 0, 0),
        [BONES.spine]: t(-5),
        [BONES.chest]: t(5),
        [BONES.head]: t(-5),
        [BONES.upper_arm_L]: t(50),
        [BONES.lower_arm_L]: t(-30),
        [BONES.upper_arm_R]: t(-50),
        [BONES.lower_arm_R]: t(-60),
        [BONES.upper_leg_L]: t(-40),
        [BONES.lower_leg_L]: t(60),
        [BONES.foot_L]: t(10),
        [BONES.upper_leg_R]: t(50),
        [BONES.lower_leg_R]: t(-10),
        [BONES.foot_R]: t(-10),
      },
    },
    // Frame 4: Flight phase 2
    {
      time: 375,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(8, 0, -3),
        [BONES.spine]: t(-3),
        [BONES.chest]: t(3),
        [BONES.head]: t(-3),
        [BONES.upper_arm_L]: t(20),
        [BONES.lower_arm_L]: t(-45),
        [BONES.upper_arm_R]: t(-20),
        [BONES.lower_arm_R]: t(-45),
        [BONES.upper_leg_L]: t(-20),
        [BONES.lower_leg_L]: t(30),
        [BONES.foot_L]: t(0),
        [BONES.upper_leg_R]: t(20),
        [BONES.lower_leg_R]: t(30),
        [BONES.foot_R]: t(0),
      },
    },
    // Loop
    {
      time: 500,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(10, 0, 0),
        [BONES.spine]: t(5),
        [BONES.chest]: t(-5),
        [BONES.head]: t(-5),
        [BONES.upper_arm_L]: t(-50),
        [BONES.lower_arm_L]: t(-60),
        [BONES.upper_arm_R]: t(50),
        [BONES.lower_arm_R]: t(-30),
        [BONES.upper_leg_L]: t(50),
        [BONES.lower_leg_L]: t(-10),
        [BONES.foot_L]: t(-10),
        [BONES.upper_leg_R]: t(-40),
        [BONES.lower_leg_R]: t(60),
        [BONES.foot_R]: t(10),
      },
    },
  ],
};

// ==========================================
// ATTACK ANIMATION - Sword swing
// ==========================================
export const ATTACK_ANIMATION: Omit<SkeletalAnimation, 'id'> = {
  name: 'Attack',
  duration: 600,
  loop: false,
  keyframes: [
    // Frame 1: Windup
    {
      time: 0,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(-5, 0, 0),
        [BONES.spine]: t(-10),
        [BONES.chest]: t(-15),
        [BONES.head]: t(5),
        [BONES.upper_arm_L]: t(10),
        [BONES.lower_arm_L]: t(0),
        [BONES.upper_arm_R]: t(-120), // Arm back
        [BONES.lower_arm_R]: t(-90),
        [BONES.hand_R]: t(30),
        [BONES.upper_leg_L]: t(-10),
        [BONES.upper_leg_R]: t(15),
      },
    },
    // Frame 2: Peak windup
    {
      time: 150,
      easing: 'ease-in',
      boneTransforms: {
        [BONES.root]: t(-8, 0, 0),
        [BONES.spine]: t(-15),
        [BONES.chest]: t(-20),
        [BONES.head]: t(10),
        [BONES.upper_arm_L]: t(15),
        [BONES.lower_arm_L]: t(10),
        [BONES.upper_arm_R]: t(-140),
        [BONES.lower_arm_R]: t(-100),
        [BONES.hand_R]: t(45),
        [BONES.upper_leg_L]: t(-15),
        [BONES.upper_leg_R]: t(20),
      },
    },
    // Frame 3: Swing through
    {
      time: 300,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(10, 0, 0),
        [BONES.spine]: t(15),
        [BONES.chest]: t(20),
        [BONES.head]: t(-10),
        [BONES.upper_arm_L]: t(-20),
        [BONES.lower_arm_L]: t(-10),
        [BONES.upper_arm_R]: t(60), // Arm forward
        [BONES.lower_arm_R]: t(20),
        [BONES.hand_R]: t(-20),
        [BONES.upper_leg_L]: t(20),
        [BONES.upper_leg_R]: t(-15),
      },
    },
    // Frame 4: Follow through
    {
      time: 400,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(15, 0, 0),
        [BONES.spine]: t(20),
        [BONES.chest]: t(25),
        [BONES.head]: t(-15),
        [BONES.upper_arm_L]: t(-25),
        [BONES.lower_arm_L]: t(-15),
        [BONES.upper_arm_R]: t(80),
        [BONES.lower_arm_R]: t(30),
        [BONES.hand_R]: t(-30),
        [BONES.upper_leg_L]: t(25),
        [BONES.upper_leg_R]: t(-20),
      },
    },
    // Frame 5: Recovery
    {
      time: 600,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 0),
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(5),
        [BONES.lower_arm_L]: t(0),
        [BONES.upper_arm_R]: t(-5),
        [BONES.lower_arm_R]: t(0),
        [BONES.hand_R]: t(0),
        [BONES.upper_leg_L]: t(0),
        [BONES.upper_leg_R]: t(0),
      },
    },
  ],
};

// ==========================================
// JUMP ANIMATION
// ==========================================
export const JUMP_ANIMATION: Omit<SkeletalAnimation, 'id'> = {
  name: 'Jump',
  duration: 800,
  loop: false,
  keyframes: [
    // Frame 1: Crouch/Anticipation
    {
      time: 0,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 8), // Lower
        [BONES.spine]: t(-10),
        [BONES.chest]: t(-10),
        [BONES.head]: t(10),
        [BONES.upper_arm_L]: t(30),
        [BONES.lower_arm_L]: t(30),
        [BONES.upper_arm_R]: t(-30),
        [BONES.lower_arm_R]: t(-30),
        [BONES.upper_leg_L]: t(-60),
        [BONES.lower_leg_L]: t(90),
        [BONES.foot_L]: t(-20),
        [BONES.upper_leg_R]: t(-60),
        [BONES.lower_leg_R]: t(90),
        [BONES.foot_R]: t(-20),
      },
    },
    // Frame 2: Launch
    {
      time: 150,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(-5, 0, -5), // Rise
        [BONES.spine]: t(5),
        [BONES.chest]: t(5),
        [BONES.head]: t(-5),
        [BONES.upper_arm_L]: t(-60),
        [BONES.lower_arm_L]: t(10),
        [BONES.upper_arm_R]: t(60),
        [BONES.lower_arm_R]: t(-10),
        [BONES.upper_leg_L]: t(30),
        [BONES.lower_leg_L]: t(20),
        [BONES.foot_L]: t(20),
        [BONES.upper_leg_R]: t(30),
        [BONES.lower_leg_R]: t(20),
        [BONES.foot_R]: t(20),
      },
    },
    // Frame 3: Peak
    {
      time: 400,
      easing: 'ease-in-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, -10), // Highest point
        [BONES.spine]: t(0),
        [BONES.chest]: t(0),
        [BONES.head]: t(0),
        [BONES.upper_arm_L]: t(-45),
        [BONES.lower_arm_L]: t(0),
        [BONES.upper_arm_R]: t(45),
        [BONES.lower_arm_R]: t(0),
        [BONES.upper_leg_L]: t(15),
        [BONES.lower_leg_L]: t(30),
        [BONES.foot_L]: t(10),
        [BONES.upper_leg_R]: t(-15),
        [BONES.lower_leg_R]: t(60),
        [BONES.foot_R]: t(0),
      },
    },
    // Frame 4: Descent
    {
      time: 600,
      easing: 'ease-in',
      boneTransforms: {
        [BONES.root]: t(5, 0, 0),
        [BONES.spine]: t(5),
        [BONES.chest]: t(5),
        [BONES.head]: t(-5),
        [BONES.upper_arm_L]: t(-20),
        [BONES.lower_arm_L]: t(20),
        [BONES.upper_arm_R]: t(20),
        [BONES.lower_arm_R]: t(-20),
        [BONES.upper_leg_L]: t(-20),
        [BONES.lower_leg_L]: t(40),
        [BONES.foot_L]: t(-10),
        [BONES.upper_leg_R]: t(-20),
        [BONES.lower_leg_R]: t(40),
        [BONES.foot_R]: t(-10),
      },
    },
    // Frame 5: Land
    {
      time: 800,
      easing: 'ease-out',
      boneTransforms: {
        [BONES.root]: t(0, 0, 5),
        [BONES.spine]: t(-5),
        [BONES.chest]: t(-5),
        [BONES.head]: t(5),
        [BONES.upper_arm_L]: t(20),
        [BONES.lower_arm_L]: t(20),
        [BONES.upper_arm_R]: t(-20),
        [BONES.lower_arm_R]: t(-20),
        [BONES.upper_leg_L]: t(-40),
        [BONES.lower_leg_L]: t(60),
        [BONES.foot_L]: t(-15),
        [BONES.upper_leg_R]: t(-40),
        [BONES.lower_leg_R]: t(60),
        [BONES.foot_R]: t(-15),
      },
    },
  ],
};

// ==========================================
// All templates in one object
// ==========================================
export const ANIMATION_TEMPLATES = {
  idle: IDLE_ANIMATION,
  walk: WALK_ANIMATION,
  run: RUN_ANIMATION,
  attack: ATTACK_ANIMATION,
  jump: JUMP_ANIMATION,
} as const;

export type AnimationTemplateType = keyof typeof ANIMATION_TEMPLATES;

// Helper to load a template into the store
export function loadAnimationTemplate(
  templateType: AnimationTemplateType,
  boneNameToIdMap: Map<string, string>
): SkeletalAnimation {
  const template = ANIMATION_TEMPLATES[templateType];

  // Convert bone names to IDs in keyframes
  const keyframes: AnimationKeyframe[] = template.keyframes.map(kf => {
    const boneTransforms: Record<string, BoneTransform> = {};

    for (const [boneName, transform] of Object.entries(kf.boneTransforms)) {
      const boneId = boneNameToIdMap.get(boneName);
      if (boneId) {
        boneTransforms[boneId] = transform;
      }
    }

    return {
      ...kf,
      boneTransforms,
    };
  });

  return {
    id: crypto.randomUUID(),
    name: template.name,
    duration: template.duration,
    loop: template.loop,
    keyframes,
  };
}

// Get frame count for a template (for sprite sheet generation)
export function getTemplateFrameCount(templateType: AnimationTemplateType): number {
  const template = ANIMATION_TEMPLATES[templateType];
  // Return keyframe count minus 1 (since last frame loops back to first)
  return template.loop ? template.keyframes.length - 1 : template.keyframes.length;
}

// Get transforms at a specific time in the animation
export function getTransformsAtTime(
  animation: SkeletalAnimation,
  time: number
): Record<string, BoneTransform> {
  const { keyframes, duration } = animation;

  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].boneTransforms;

  // Normalize time for looping
  const normalizedTime = animation.loop ? time % duration : Math.min(time, duration);

  // Find surrounding keyframes
  let startFrame = keyframes[0];
  let endFrame = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (normalizedTime >= keyframes[i].time && normalizedTime < keyframes[i + 1].time) {
      startFrame = keyframes[i];
      endFrame = keyframes[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const frameDuration = endFrame.time - startFrame.time;
  const t = frameDuration > 0 ? (normalizedTime - startFrame.time) / frameDuration : 0;

  // Interpolate all transforms
  const result: Record<string, BoneTransform> = {};
  const allBoneIds = new Set([
    ...Object.keys(startFrame.boneTransforms),
    ...Object.keys(endFrame.boneTransforms),
  ]);

  for (const boneId of allBoneIds) {
    const startT = startFrame.boneTransforms[boneId] || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const endT = endFrame.boneTransforms[boneId] || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };

    result[boneId] = {
      rotation: startT.rotation + (endT.rotation - startT.rotation) * t,
      x: startT.x + (endT.x - startT.x) * t,
      y: startT.y + (endT.y - startT.y) * t,
      scaleX: startT.scaleX + (endT.scaleX - startT.scaleX) * t,
      scaleY: startT.scaleY + (endT.scaleY - startT.scaleY) * t,
    };
  }

  return result;
}
