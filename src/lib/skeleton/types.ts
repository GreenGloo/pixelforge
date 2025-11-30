// ==========================================
// Skeleton Rigging Types and Interfaces
// ==========================================

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  x: number; // Position relative to parent (or canvas if root)
  y: number;
  rotation: number; // Degrees
  length: number;
  color: string; // For visualization
}

export interface BoneTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Pose {
  id: string;
  name: string;
  boneTransforms: Record<string, BoneTransform>; // boneId -> transform
}

export interface AnimationKeyframe {
  time: number; // ms
  boneTransforms: Record<string, BoneTransform>;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface SkeletalAnimation {
  id: string;
  name: string;
  duration: number; // ms
  loop: boolean;
  keyframes: AnimationKeyframe[];
}

export interface SkeletonState {
  bones: Bone[];
  selectedBoneId: string | null;
  poses: Pose[];
  animations: SkeletalAnimation[];
  currentAnimationId: string | null;
  isAnimating: boolean;
  showBones: boolean;
}

// Default bone colors for hierarchy visualization
export const BONE_COLORS = [
  '#ff6b6b', // Red - root
  '#4ecdc4', // Teal
  '#45b7d1', // Blue
  '#96ceb4', // Green
  '#ffeaa7', // Yellow
  '#dfe6e9', // Gray
  '#a29bfe', // Purple
  '#fd79a8', // Pink
];

// Common humanoid skeleton presets
export const HUMANOID_SKELETON: Omit<Bone, 'id'>[] = [
  { name: 'root', parentId: null, x: 32, y: 48, rotation: 0, length: 0, color: BONE_COLORS[0] },
  { name: 'spine', parentId: 'root', x: 0, y: -8, rotation: 0, length: 8, color: BONE_COLORS[1] },
  { name: 'chest', parentId: 'spine', x: 0, y: -8, rotation: 0, length: 8, color: BONE_COLORS[1] },
  { name: 'neck', parentId: 'chest', x: 0, y: -4, rotation: 0, length: 4, color: BONE_COLORS[2] },
  { name: 'head', parentId: 'neck', x: 0, y: -6, rotation: 0, length: 6, color: BONE_COLORS[2] },

  // Left arm
  { name: 'shoulder_L', parentId: 'chest', x: -6, y: 0, rotation: -90, length: 2, color: BONE_COLORS[3] },
  { name: 'upper_arm_L', parentId: 'shoulder_L', x: 0, y: 0, rotation: 0, length: 6, color: BONE_COLORS[3] },
  { name: 'lower_arm_L', parentId: 'upper_arm_L', x: 6, y: 0, rotation: 0, length: 6, color: BONE_COLORS[3] },
  { name: 'hand_L', parentId: 'lower_arm_L', x: 6, y: 0, rotation: 0, length: 3, color: BONE_COLORS[3] },

  // Right arm
  { name: 'shoulder_R', parentId: 'chest', x: 6, y: 0, rotation: 90, length: 2, color: BONE_COLORS[4] },
  { name: 'upper_arm_R', parentId: 'shoulder_R', x: 0, y: 0, rotation: 0, length: 6, color: BONE_COLORS[4] },
  { name: 'lower_arm_R', parentId: 'upper_arm_R', x: 6, y: 0, rotation: 0, length: 6, color: BONE_COLORS[4] },
  { name: 'hand_R', parentId: 'lower_arm_R', x: 6, y: 0, rotation: 0, length: 3, color: BONE_COLORS[4] },

  // Left leg
  { name: 'hip_L', parentId: 'root', x: -4, y: 4, rotation: 90, length: 2, color: BONE_COLORS[5] },
  { name: 'upper_leg_L', parentId: 'hip_L', x: 0, y: 0, rotation: 0, length: 8, color: BONE_COLORS[5] },
  { name: 'lower_leg_L', parentId: 'upper_leg_L', x: 8, y: 0, rotation: 0, length: 8, color: BONE_COLORS[5] },
  { name: 'foot_L', parentId: 'lower_leg_L', x: 8, y: 0, rotation: -90, length: 4, color: BONE_COLORS[5] },

  // Right leg
  { name: 'hip_R', parentId: 'root', x: 4, y: 4, rotation: 90, length: 2, color: BONE_COLORS[6] },
  { name: 'upper_leg_R', parentId: 'hip_R', x: 0, y: 0, rotation: 0, length: 8, color: BONE_COLORS[6] },
  { name: 'lower_leg_R', parentId: 'upper_leg_R', x: 8, y: 0, rotation: 0, length: 8, color: BONE_COLORS[6] },
  { name: 'foot_R', parentId: 'lower_leg_R', x: 8, y: 0, rotation: -90, length: 4, color: BONE_COLORS[6] },
];

// Helper functions
export function createBone(
  name: string,
  parentId: string | null,
  x: number,
  y: number,
  rotation: number = 0,
  length: number = 10
): Bone {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
    x,
    y,
    rotation,
    length,
    color: BONE_COLORS[Math.floor(Math.random() * BONE_COLORS.length)],
  };
}

export function createDefaultTransform(): BoneTransform {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export function createPose(name: string, bones: Bone[]): Pose {
  const boneTransforms: Record<string, BoneTransform> = {};
  for (const bone of bones) {
    boneTransforms[bone.id] = createDefaultTransform();
  }
  return {
    id: crypto.randomUUID(),
    name,
    boneTransforms,
  };
}

export function createAnimation(name: string): SkeletalAnimation {
  return {
    id: crypto.randomUUID(),
    name,
    duration: 1000,
    loop: true,
    keyframes: [],
  };
}

export function createInitialSkeletonState(): SkeletonState {
  return {
    bones: [],
    selectedBoneId: null,
    poses: [],
    animations: [],
    currentAnimationId: null,
    isAnimating: false,
    showBones: true,
  };
}

// Get world position of a bone (accounting for parent chain)
export function getBoneWorldPosition(
  bone: Bone,
  bones: Bone[],
  transforms?: Record<string, BoneTransform>
): { x: number; y: number; rotation: number } {
  const boneMap = new Map(bones.map(b => [b.id, b]));

  let worldX = bone.x;
  let worldY = bone.y;
  let worldRotation = bone.rotation;

  // Apply transform if available
  if (transforms && transforms[bone.id]) {
    const t = transforms[bone.id];
    worldX += t.x;
    worldY += t.y;
    worldRotation += t.rotation;
  }

  // Walk up parent chain
  let currentBone = bone;
  while (currentBone.parentId) {
    const parent = boneMap.get(currentBone.parentId);
    if (!parent) break;

    // Get parent transform
    let parentRotation = parent.rotation;
    let parentX = parent.x;
    let parentY = parent.y;

    if (transforms && transforms[parent.id]) {
      const pt = transforms[parent.id];
      parentX += pt.x;
      parentY += pt.y;
      parentRotation += pt.rotation;
    }

    // Rotate around parent
    const rad = (parentRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const localX = worldX;
    const localY = worldY;

    worldX = parentX + localX * cos - localY * sin;
    worldY = parentY + localX * sin + localY * cos;
    worldRotation += parentRotation;

    currentBone = parent;
  }

  return { x: worldX, y: worldY, rotation: worldRotation };
}

// Interpolate between two transforms
export function lerpTransform(
  a: BoneTransform,
  b: BoneTransform,
  t: number
): BoneTransform {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    rotation: a.rotation + (b.rotation - a.rotation) * t,
    scaleX: a.scaleX + (b.scaleX - a.scaleX) * t,
    scaleY: a.scaleY + (b.scaleY - a.scaleY) * t,
  };
}

// Apply easing function
export function applyEasing(
  t: number,
  easing: AnimationKeyframe['easing']
): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear':
    default:
      return t;
  }
}
