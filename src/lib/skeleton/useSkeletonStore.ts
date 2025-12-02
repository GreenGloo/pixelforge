// ==========================================
// Skeleton State Management with Zustand
// ==========================================

import { create } from 'zustand';
import {
  Bone,
  BoneTransform,
  Pose,
  SkeletalAnimation,
  AnimationKeyframe,
  SkeletonState,
  createBone,
  createPose,
  createAnimation,
  createDefaultTransform,
  createInitialSkeletonState,
  HUMANOID_SKELETON,
  BONE_COLORS,
} from './types';
import { AnimationTemplateType, loadAnimationTemplate, ANIMATION_TEMPLATES } from './animationTemplates';
import {
  IKChain,
  IKConstraint,
  createIKChain,
  createHumanoidConstraints,
  solveIK,
} from './ikSolver';

// Sprite part - maps a region of pixels to a bone
export interface SpritePart {
  id: string;
  name: string;
  boneId: string;
  // Bounding box in sprite coordinates
  x: number;
  y: number;
  width: number;
  height: number;
  // Pivot point relative to bounding box (0-1)
  pivotX: number;
  pivotY: number;
}

interface SkeletonStore extends SkeletonState {
  // IK State
  ikChains: IKChain[];
  ikConstraints: IKConstraint[];
  ikEnabled: boolean;
  activeIKChainId: string | null;

  // Sprite rigging state
  spriteParts: SpritePart[];
  currentTransforms: Record<string, BoneTransform>;
  animationEnabled: boolean;

  // Bone actions
  addBone: (name: string, parentId: string | null, x: number, y: number) => void;
  removeBone: (id: string) => void;
  selectBone: (id: string | null) => void;
  updateBone: (id: string, updates: Partial<Bone>) => void;
  moveBone: (id: string, x: number, y: number) => void;
  rotateBone: (id: string, rotation: number) => void;
  renameBone: (id: string, name: string) => void;

  // IK actions
  addIKChain: (name: string, endEffectorBoneId: string, chainLength?: number) => void;
  removeIKChain: (id: string) => void;
  updateIKTarget: (chainId: string, x: number, y: number) => void;
  setActiveIKChain: (id: string | null) => void;
  toggleIK: () => void;
  solveIKChain: (chainId: string, transforms: Record<string, BoneTransform>) => Record<string, BoneTransform>;
  setupHumanoidIK: () => void;

  // Skeleton presets
  loadHumanoidSkeleton: (canvasWidth?: number, canvasHeight?: number) => void;
  clearSkeleton: () => void;

  // Pose actions
  addPose: (name: string) => void;
  removePose: (id: string) => void;
  updatePoseTransform: (poseId: string, boneId: string, transform: Partial<BoneTransform>) => void;
  applyPose: (poseId: string) => Record<string, BoneTransform>;
  savePoseFromCurrent: (name: string, transforms: Record<string, BoneTransform>) => void;

  // Animation actions
  addAnimation: (name: string) => void;
  removeAnimation: (id: string) => void;
  selectAnimation: (id: string | null) => void;
  addKeyframe: (animationId: string, time: number, transforms: Record<string, BoneTransform>) => void;
  removeKeyframe: (animationId: string, time: number) => void;
  updateKeyframeEasing: (animationId: string, time: number, easing: AnimationKeyframe['easing']) => void;
  setAnimationDuration: (animationId: string, duration: number) => void;
  setAnimationLoop: (animationId: string, loop: boolean) => void;

  // Animation templates
  loadAnimationTemplate: (templateType: AnimationTemplateType) => void;
  getAvailableTemplates: () => AnimationTemplateType[];

  // Playback
  setIsAnimating: (isAnimating: boolean) => void;
  toggleShowBones: () => void;

  // Import/Export
  exportSkeleton: () => string;
  importSkeleton: (json: string) => void;

  // Helpers
  getBoneNameToIdMap: () => Map<string, string>;

  // Sprite rigging actions
  addSpritePart: (name: string, boneId: string, x: number, y: number, width: number, height: number) => void;
  removeSpritePart: (id: string) => void;
  updateSpritePart: (id: string, updates: Partial<SpritePart>) => void;
  autoRigSprite: (width: number, height: number, pixels: Uint8ClampedArray) => void;
  setCurrentTransforms: (transforms: Record<string, BoneTransform>) => void;
  toggleAnimation: () => void;

  // Reset
  reset: () => void;
}

export const useSkeletonStore = create<SkeletonStore>((set, get) => ({
  ...createInitialSkeletonState(),

  // IK initial state
  ikChains: [],
  ikConstraints: [],
  ikEnabled: false,
  activeIKChainId: null,

  // Sprite rigging initial state
  spriteParts: [],
  currentTransforms: {},
  animationEnabled: true,

  // Bone actions
  addBone: (name, parentId, x, y) => {
    const bones = get().bones;
    const depth = parentId ? getDepth(bones, parentId) : 0;
    const newBone = createBone(name, parentId, x, y, 0, 10);
    newBone.color = BONE_COLORS[depth % BONE_COLORS.length];
    set({ bones: [...bones, newBone], selectedBoneId: newBone.id });
  },

  removeBone: (id) => {
    const bones = get().bones;
    // Remove bone and all children
    const idsToRemove = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const bone of bones) {
        if (bone.parentId && idsToRemove.has(bone.parentId) && !idsToRemove.has(bone.id)) {
          idsToRemove.add(bone.id);
          changed = true;
        }
      }
    }
    const newBones = bones.filter(b => !idsToRemove.has(b.id));
    set({
      bones: newBones,
      selectedBoneId: get().selectedBoneId === id ? null : get().selectedBoneId,
    });
  },

  selectBone: (id) => set({ selectedBoneId: id }),

  updateBone: (id, updates) => {
    set({
      bones: get().bones.map(b => (b.id === id ? { ...b, ...updates } : b)),
    });
  },

  moveBone: (id, x, y) => {
    set({
      bones: get().bones.map(b => (b.id === id ? { ...b, x, y } : b)),
    });
  },

  rotateBone: (id, rotation) => {
    set({
      bones: get().bones.map(b => (b.id === id ? { ...b, rotation } : b)),
    });
  },

  renameBone: (id, name) => {
    set({
      bones: get().bones.map(b => (b.id === id ? { ...b, name } : b)),
    });
  },

  // Skeleton presets
  loadHumanoidSkeleton: (canvasWidth = 64, canvasHeight = 64) => {
    const bones: Bone[] = [];
    const nameToId = new Map<string, string>();

    // Scale factor based on canvas size (template is for 64x64)
    const scaleX = canvasWidth / 64;
    const scaleY = canvasHeight / 64;

    // Create bones with proper IDs and parent references
    for (const template of HUMANOID_SKELETON) {
      const id = crypto.randomUUID();
      nameToId.set(template.name, id);

      const parentId = template.parentId ? nameToId.get(template.parentId) || null : null;

      // Scale positions - root bone gets absolute position, children are relative
      const isRoot = template.parentId === null;
      const x = isRoot ? template.x * scaleX : template.x * scaleX;
      const y = isRoot ? template.y * scaleY : template.y * scaleY;

      bones.push({
        id,
        name: template.name,
        parentId,
        x,
        y,
        rotation: template.rotation,
        length: template.length * Math.min(scaleX, scaleY),
        color: template.color,
      });
    }

    set({ bones, selectedBoneId: bones[0]?.id || null, spriteParts: [] });
  },

  clearSkeleton: () => {
    set({ bones: [], selectedBoneId: null, poses: [], animations: [], ikChains: [], ikConstraints: [] });
  },

  // IK actions
  addIKChain: (name, endEffectorBoneId, chainLength = 3) => {
    const chain = createIKChain(name, endEffectorBoneId, chainLength);
    set({ ikChains: [...get().ikChains, chain] });
  },

  removeIKChain: (id) => {
    set({
      ikChains: get().ikChains.filter(c => c.id !== id),
      activeIKChainId: get().activeIKChainId === id ? null : get().activeIKChainId,
    });
  },

  updateIKTarget: (chainId, x, y) => {
    set({
      ikChains: get().ikChains.map(c =>
        c.id === chainId ? { ...c, targetX: x, targetY: y } : c
      ),
    });
  },

  setActiveIKChain: (id) => set({ activeIKChainId: id }),

  toggleIK: () => set({ ikEnabled: !get().ikEnabled }),

  solveIKChain: (chainId, transforms) => {
    const chain = get().ikChains.find(c => c.id === chainId);
    if (!chain || !chain.enabled) {
      return transforms;
    }

    return solveIK(get().bones, chain, transforms, get().ikConstraints);
  },

  setupHumanoidIK: () => {
    const bones = get().bones;
    const boneNameToId = new Map(bones.map(b => [b.name, b.id]));

    // Create IK chains for hands and feet
    const chains: IKChain[] = [];

    const handL = boneNameToId.get('hand_L');
    if (handL) {
      const chain = createIKChain('Left Hand', handL, 3);
      chain.targetX = 20;
      chain.targetY = 32;
      chains.push(chain);
    }

    const handR = boneNameToId.get('hand_R');
    if (handR) {
      const chain = createIKChain('Right Hand', handR, 3);
      chain.targetX = 44;
      chain.targetY = 32;
      chains.push(chain);
    }

    const footL = boneNameToId.get('foot_L');
    if (footL) {
      const chain = createIKChain('Left Foot', footL, 3);
      chain.targetX = 24;
      chain.targetY = 60;
      chains.push(chain);
    }

    const footR = boneNameToId.get('foot_R');
    if (footR) {
      const chain = createIKChain('Right Foot', footR, 3);
      chain.targetX = 40;
      chain.targetY = 60;
      chains.push(chain);
    }

    // Create constraints for realistic movement
    const constraints = createHumanoidConstraints(bones, boneNameToId);

    set({
      ikChains: chains,
      ikConstraints: constraints,
      ikEnabled: true,
    });
  },

  // Pose actions
  addPose: (name) => {
    const pose = createPose(name, get().bones);
    set({ poses: [...get().poses, pose] });
  },

  removePose: (id) => {
    set({ poses: get().poses.filter(p => p.id !== id) });
  },

  updatePoseTransform: (poseId, boneId, transform) => {
    set({
      poses: get().poses.map(p => {
        if (p.id !== poseId) return p;
        return {
          ...p,
          boneTransforms: {
            ...p.boneTransforms,
            [boneId]: { ...p.boneTransforms[boneId], ...transform },
          },
        };
      }),
    });
  },

  applyPose: (poseId) => {
    const pose = get().poses.find(p => p.id === poseId);
    return pose?.boneTransforms || {};
  },

  savePoseFromCurrent: (name, transforms) => {
    const pose: Pose = {
      id: crypto.randomUUID(),
      name,
      boneTransforms: { ...transforms },
    };
    set({ poses: [...get().poses, pose] });
  },

  // Animation actions
  addAnimation: (name) => {
    const animation = createAnimation(name);
    set({ animations: [...get().animations, animation] });
  },

  removeAnimation: (id) => {
    const state = get();
    set({
      animations: state.animations.filter(a => a.id !== id),
      currentAnimationId: state.currentAnimationId === id ? null : state.currentAnimationId,
    });
  },

  selectAnimation: (id) => set({ currentAnimationId: id }),

  addKeyframe: (animationId, time, transforms) => {
    set({
      animations: get().animations.map(a => {
        if (a.id !== animationId) return a;

        // Remove existing keyframe at same time
        const keyframes = a.keyframes.filter(k => k.time !== time);

        // Add new keyframe
        keyframes.push({
          time,
          boneTransforms: { ...transforms },
          easing: 'linear',
        });

        // Sort by time
        keyframes.sort((a, b) => a.time - b.time);

        return { ...a, keyframes };
      }),
    });
  },

  removeKeyframe: (animationId, time) => {
    set({
      animations: get().animations.map(a => {
        if (a.id !== animationId) return a;
        return {
          ...a,
          keyframes: a.keyframes.filter(k => k.time !== time),
        };
      }),
    });
  },

  updateKeyframeEasing: (animationId, time, easing) => {
    set({
      animations: get().animations.map(a => {
        if (a.id !== animationId) return a;
        return {
          ...a,
          keyframes: a.keyframes.map(k =>
            k.time === time ? { ...k, easing } : k
          ),
        };
      }),
    });
  },

  setAnimationDuration: (animationId, duration) => {
    set({
      animations: get().animations.map(a =>
        a.id === animationId ? { ...a, duration } : a
      ),
    });
  },

  setAnimationLoop: (animationId, loop) => {
    set({
      animations: get().animations.map(a =>
        a.id === animationId ? { ...a, loop } : a
      ),
    });
  },

  // Playback
  setIsAnimating: (isAnimating) => set({ isAnimating }),
  toggleShowBones: () => set({ showBones: !get().showBones }),

  // Animation templates
  loadAnimationTemplate: (templateType) => {
    const bones = get().bones;
    if (bones.length === 0) {
      console.warn('No bones loaded. Load a skeleton first.');
      return;
    }

    // Build name-to-id map
    const boneNameToIdMap = new Map(bones.map(b => [b.name, b.id]));

    // Load the template with proper bone IDs
    const animation = loadAnimationTemplate(templateType, boneNameToIdMap);

    // Add to animations
    set({
      animations: [...get().animations, animation],
      currentAnimationId: animation.id,
    });
  },

  getAvailableTemplates: () => {
    return Object.keys(ANIMATION_TEMPLATES) as AnimationTemplateType[];
  },

  // Helpers
  getBoneNameToIdMap: () => {
    const bones = get().bones;
    return new Map(bones.map(b => [b.name, b.id]));
  },

  // Import/Export
  exportSkeleton: () => {
    const { bones, poses, animations } = get();
    return JSON.stringify({ bones, poses, animations }, null, 2);
  },

  importSkeleton: (json) => {
    try {
      const data = JSON.parse(json);
      set({
        bones: data.bones || [],
        poses: data.poses || [],
        animations: data.animations || [],
        selectedBoneId: null,
        currentAnimationId: null,
      });
    } catch (e) {
      console.error('Failed to import skeleton:', e);
    }
  },

  // Sprite rigging actions
  addSpritePart: (name, boneId, x, y, width, height) => {
    const part: SpritePart = {
      id: crypto.randomUUID(),
      name,
      boneId,
      x,
      y,
      width,
      height,
      pivotX: 0.5,
      pivotY: 0.5,
    };
    set({ spriteParts: [...get().spriteParts, part] });
  },

  removeSpritePart: (id) => {
    set({ spriteParts: get().spriteParts.filter(p => p.id !== id) });
  },

  updateSpritePart: (id, updates) => {
    set({
      spriteParts: get().spriteParts.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  },

  autoRigSprite: (width, height, pixels) => {
    const bones = get().bones;
    if (bones.length === 0) return;

    // Build name to id map
    const boneNameToId = new Map(bones.map(b => [b.name, b.id]));
    const parts: SpritePart[] = [];

    // Analyze sprite to find body regions based on humanoid skeleton
    // For a typical 64x64 sprite:
    const spriteHeight = height;
    const spriteWidth = width;
    const centerX = spriteWidth / 2;

    // Detect actual sprite bounds by scanning for non-transparent pixels
    let minY = spriteHeight, maxY = 0, minX = spriteWidth, maxX = 0;
    for (let y = 0; y < spriteHeight; y++) {
      for (let x = 0; x < spriteWidth; x++) {
        const idx = (y * spriteWidth + x) * 4;
        if (pixels[idx + 3] > 10) { // has some alpha
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    if (maxY <= minY || maxX <= minX) return; // No pixels found

    const actualHeight = maxY - minY;
    const actualWidth = maxX - minX;
    const actualCenterX = minX + actualWidth / 2;

    // Define body part regions proportionally
    const headHeight = actualHeight * 0.2;
    const torsoHeight = actualHeight * 0.3;
    const legHeight = actualHeight * 0.5;

    const headBone = boneNameToId.get('head');
    if (headBone) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Head',
        boneId: headBone,
        x: Math.floor(actualCenterX - actualWidth * 0.2),
        y: minY,
        width: Math.ceil(actualWidth * 0.4),
        height: Math.ceil(headHeight),
        pivotX: 0.5,
        pivotY: 1.0,
      });
    }

    const spineBone = boneNameToId.get('spine');
    if (spineBone) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Torso',
        boneId: spineBone,
        x: Math.floor(actualCenterX - actualWidth * 0.3),
        y: Math.floor(minY + headHeight),
        width: Math.ceil(actualWidth * 0.6),
        height: Math.ceil(torsoHeight),
        pivotX: 0.5,
        pivotY: 0.3,
      });
    }

    // Arms
    const armL = boneNameToId.get('upperArm_L');
    if (armL) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Left Arm',
        boneId: armL,
        x: minX,
        y: Math.floor(minY + headHeight),
        width: Math.ceil(actualWidth * 0.2),
        height: Math.ceil(torsoHeight * 0.8),
        pivotX: 1.0,
        pivotY: 0.1,
      });
    }

    const armR = boneNameToId.get('upperArm_R');
    if (armR) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Right Arm',
        boneId: armR,
        x: Math.floor(maxX - actualWidth * 0.2),
        y: Math.floor(minY + headHeight),
        width: Math.ceil(actualWidth * 0.2),
        height: Math.ceil(torsoHeight * 0.8),
        pivotX: 0.0,
        pivotY: 0.1,
      });
    }

    // Legs
    const legL = boneNameToId.get('upperLeg_L');
    if (legL) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Left Leg',
        boneId: legL,
        x: Math.floor(actualCenterX - actualWidth * 0.25),
        y: Math.floor(minY + headHeight + torsoHeight),
        width: Math.ceil(actualWidth * 0.25),
        height: Math.ceil(legHeight),
        pivotX: 0.5,
        pivotY: 0.0,
      });
    }

    const legR = boneNameToId.get('upperLeg_R');
    if (legR) {
      parts.push({
        id: crypto.randomUUID(),
        name: 'Right Leg',
        boneId: legR,
        x: Math.floor(actualCenterX),
        y: Math.floor(minY + headHeight + torsoHeight),
        width: Math.ceil(actualWidth * 0.25),
        height: Math.ceil(legHeight),
        pivotX: 0.5,
        pivotY: 0.0,
      });
    }

    set({ spriteParts: parts });
  },

  setCurrentTransforms: (transforms) => set({ currentTransforms: transforms }),

  toggleAnimation: () => set({ animationEnabled: !get().animationEnabled }),

  // Reset
  reset: () => set({
    ...createInitialSkeletonState(),
    ikChains: [],
    ikConstraints: [],
    ikEnabled: false,
    activeIKChainId: null,
    spriteParts: [],
    currentTransforms: {},
    animationEnabled: true,
  }),
}));

// Helper function to get bone depth in hierarchy
function getDepth(bones: Bone[], boneId: string): number {
  const boneMap = new Map(bones.map(b => [b.id, b]));
  let depth = 0;
  let bone = boneMap.get(boneId);

  while (bone?.parentId) {
    depth++;
    bone = boneMap.get(bone.parentId);
  }

  return depth;
}
