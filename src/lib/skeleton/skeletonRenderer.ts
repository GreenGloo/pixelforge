// ==========================================
// Skeleton Pose Renderer
// Renders skeleton poses to canvas for AI-guided generation
// ==========================================

import { Bone, BoneTransform, getBoneWorldPosition } from './types';

export interface RenderOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  boneColor?: string;
  jointColor?: string;
  lineWidth?: number;
  jointRadius?: number;
}

const DEFAULT_OPTIONS: RenderOptions = {
  width: 64,
  height: 64,
  backgroundColor: '#000000',
  boneColor: '#ffffff',
  jointColor: '#ff0000',
  lineWidth: 2,
  jointRadius: 3,
};

/**
 * Render a skeleton pose to a canvas and return as base64 PNG
 * This creates a simple stick figure that can be used as an img2img reference
 */
export function renderSkeletonPose(
  bones: Bone[],
  transforms: Record<string, BoneTransform>,
  options: Partial<RenderOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height, backgroundColor, boneColor, jointColor, lineWidth, jointRadius } = opts;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw bones
  ctx.strokeStyle = boneColor || '#ffffff';
  ctx.lineWidth = lineWidth || 2;
  ctx.lineCap = 'round';

  for (const bone of bones) {
    const worldPos = getBoneWorldPosition(bone, bones, transforms);

    // Calculate end point based on length and rotation
    const rad = (worldPos.rotation * Math.PI) / 180;
    const endX = worldPos.x + Math.cos(rad) * bone.length;
    const endY = worldPos.y + Math.sin(rad) * bone.length;

    // Draw bone line
    ctx.beginPath();
    ctx.moveTo(worldPos.x, worldPos.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  // Draw joints on top
  ctx.fillStyle = jointColor || '#ff0000';
  for (const bone of bones) {
    const worldPos = getBoneWorldPosition(bone, bones, transforms);

    ctx.beginPath();
    ctx.arc(worldPos.x, worldPos.y, jointRadius || 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Return as base64
  return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Render skeleton pose with filled body shape (silhouette)
 * More useful for AI guidance as it shows body volume
 */
export function renderSkeletonSilhouette(
  bones: Bone[],
  transforms: Record<string, BoneTransform>,
  options: Partial<RenderOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height, backgroundColor } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // Build bone position map
  const bonePositions = new Map<string, { start: { x: number; y: number }; end: { x: number; y: number } }>();

  for (const bone of bones) {
    const worldPos = getBoneWorldPosition(bone, bones, transforms);
    const rad = (worldPos.rotation * Math.PI) / 180;
    const endX = worldPos.x + Math.cos(rad) * bone.length;
    const endY = worldPos.y + Math.sin(rad) * bone.length;

    bonePositions.set(bone.name, {
      start: { x: worldPos.x, y: worldPos.y },
      end: { x: endX, y: endY },
    });
  }

  // Helper to get bone position
  const getPos = (boneName: string) => bonePositions.get(boneName);

  // Draw body silhouette using filled shapes
  ctx.fillStyle = '#ffffff';

  // Head (circle)
  const head = getPos('head');
  const neck = getPos('neck');
  if (head && neck) {
    ctx.beginPath();
    ctx.arc(head.end.x, head.end.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso (rectangle approximation)
  const chest = getPos('chest');
  const spine = getPos('spine');
  const shoulderL = getPos('shoulder_L');
  const shoulderR = getPos('shoulder_R');
  const hipL = getPos('hip_L');
  const hipR = getPos('hip_R');

  if (chest && spine && shoulderL && shoulderR && hipL && hipR) {
    ctx.beginPath();
    ctx.moveTo(shoulderL.end.x, shoulderL.end.y);
    ctx.lineTo(shoulderR.end.x, shoulderR.end.y);
    ctx.lineTo(hipR.start.x + 2, hipR.start.y);
    ctx.lineTo(hipL.start.x - 2, hipL.start.y);
    ctx.closePath();
    ctx.fill();
  }

  // Draw limbs as thick lines
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';

  // Arms
  const limbThickness = 4;
  ctx.lineWidth = limbThickness;

  ['_L', '_R'].forEach(side => {
    const upperArm = getPos(`upper_arm${side}`);
    const lowerArm = getPos(`lower_arm${side}`);
    const hand = getPos(`hand${side}`);

    if (upperArm && lowerArm && hand) {
      ctx.beginPath();
      ctx.moveTo(upperArm.start.x, upperArm.start.y);
      ctx.lineTo(upperArm.end.x, upperArm.end.y);
      ctx.lineTo(lowerArm.end.x, lowerArm.end.y);
      ctx.lineTo(hand.end.x, hand.end.y);
      ctx.stroke();
    }

    const upperLeg = getPos(`upper_leg${side}`);
    const lowerLeg = getPos(`lower_leg${side}`);
    const foot = getPos(`foot${side}`);

    if (upperLeg && lowerLeg && foot) {
      ctx.beginPath();
      ctx.moveTo(upperLeg.start.x, upperLeg.start.y);
      ctx.lineTo(upperLeg.end.x, upperLeg.end.y);
      ctx.lineTo(lowerLeg.end.x, lowerLeg.end.y);
      ctx.lineTo(foot.end.x, foot.end.y);
      ctx.stroke();
    }
  });

  return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Generate a pose description string from skeleton transforms
 * Used to guide text-to-image generation
 */
export function describePose(
  bones: Bone[],
  transforms: Record<string, BoneTransform>
): string {
  const descriptions: string[] = [];

  // Build bone position map
  const boneMap = new Map(bones.map(b => [b.name, b]));
  const transformMap = new Map(Object.entries(transforms));

  // Analyze arm positions
  const upperArmL = boneMap.get('upper_arm_L');
  const upperArmR = boneMap.get('upper_arm_R');

  if (upperArmL && upperArmR) {
    const rotL = (transformMap.get(upperArmL.id)?.rotation || 0) + upperArmL.rotation;
    const rotR = (transformMap.get(upperArmR.id)?.rotation || 0) + upperArmR.rotation;

    // Describe arm positions
    if (rotL < -60) descriptions.push('left arm raised');
    else if (rotL > 30) descriptions.push('left arm back');
    else descriptions.push('left arm at side');

    if (rotR > 60) descriptions.push('right arm raised');
    else if (rotR < -30) descriptions.push('right arm back');
    else descriptions.push('right arm at side');
  }

  // Analyze leg positions
  const upperLegL = boneMap.get('upper_leg_L');
  const upperLegR = boneMap.get('upper_leg_R');

  if (upperLegL && upperLegR) {
    const rotL = (transformMap.get(upperLegL.id)?.rotation || 0) + upperLegL.rotation;
    const rotR = (transformMap.get(upperLegR.id)?.rotation || 0) + upperLegR.rotation;

    if (Math.abs(rotL - rotR) > 40) {
      descriptions.push('legs apart in stride');
    } else if (rotL < 60 && rotR < 60) {
      descriptions.push('legs bent');
    } else {
      descriptions.push('standing straight');
    }
  }

  // Analyze body lean
  const root = boneMap.get('root');
  if (root) {
    const rootRot = (transformMap.get(root.id)?.rotation || 0);
    if (rootRot > 10) descriptions.push('leaning forward');
    else if (rootRot < -10) descriptions.push('leaning back');
  }

  return descriptions.join(', ');
}

/**
 * Render animation frames from skeleton animation
 * Returns array of base64 PNG strings
 */
export function renderAnimationFrames(
  bones: Bone[],
  keyframes: Array<{ time: number; boneTransforms: Record<string, BoneTransform> }>,
  frameCount: number,
  duration: number,
  options: Partial<RenderOptions> = {}
): string[] {
  const frames: string[] = [];

  for (let i = 0; i < frameCount; i++) {
    const time = (i / frameCount) * duration;

    // Find surrounding keyframes
    let startFrame = keyframes[0];
    let endFrame = keyframes[keyframes.length - 1];

    for (let j = 0; j < keyframes.length - 1; j++) {
      if (time >= keyframes[j].time && time < keyframes[j + 1].time) {
        startFrame = keyframes[j];
        endFrame = keyframes[j + 1];
        break;
      }
    }

    // Interpolate
    const frameDuration = endFrame.time - startFrame.time;
    const t = frameDuration > 0 ? (time - startFrame.time) / frameDuration : 0;

    const interpolatedTransforms: Record<string, BoneTransform> = {};
    const allBoneIds = new Set([
      ...Object.keys(startFrame.boneTransforms),
      ...Object.keys(endFrame.boneTransforms),
    ]);

    for (const boneId of allBoneIds) {
      const startT = startFrame.boneTransforms[boneId] || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };
      const endT = endFrame.boneTransforms[boneId] || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };

      interpolatedTransforms[boneId] = {
        rotation: startT.rotation + (endT.rotation - startT.rotation) * t,
        x: startT.x + (endT.x - startT.x) * t,
        y: startT.y + (endT.y - startT.y) * t,
        scaleX: startT.scaleX + (endT.scaleX - startT.scaleX) * t,
        scaleY: startT.scaleY + (endT.scaleY - startT.scaleY) * t,
      };
    }

    // Render this frame
    frames.push(renderSkeletonSilhouette(bones, interpolatedTransforms, options));
  }

  return frames;
}
