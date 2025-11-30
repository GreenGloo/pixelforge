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

interface SkeletonStore extends SkeletonState {
  // Bone actions
  addBone: (name: string, parentId: string | null, x: number, y: number) => void;
  removeBone: (id: string) => void;
  selectBone: (id: string | null) => void;
  updateBone: (id: string, updates: Partial<Bone>) => void;
  moveBone: (id: string, x: number, y: number) => void;
  rotateBone: (id: string, rotation: number) => void;
  renameBone: (id: string, name: string) => void;

  // Skeleton presets
  loadHumanoidSkeleton: () => void;
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

  // Playback
  setIsAnimating: (isAnimating: boolean) => void;
  toggleShowBones: () => void;

  // Import/Export
  exportSkeleton: () => string;
  importSkeleton: (json: string) => void;

  // Reset
  reset: () => void;
}

export const useSkeletonStore = create<SkeletonStore>((set, get) => ({
  ...createInitialSkeletonState(),

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
  loadHumanoidSkeleton: () => {
    const bones: Bone[] = [];
    const nameToId = new Map<string, string>();

    // Create bones with proper IDs and parent references
    for (const template of HUMANOID_SKELETON) {
      const id = crypto.randomUUID();
      nameToId.set(template.name, id);

      const parentId = template.parentId ? nameToId.get(template.parentId) || null : null;

      bones.push({
        id,
        name: template.name,
        parentId,
        x: template.x,
        y: template.y,
        rotation: template.rotation,
        length: template.length,
        color: template.color,
      });
    }

    set({ bones, selectedBoneId: bones[0]?.id || null });
  },

  clearSkeleton: () => {
    set({ bones: [], selectedBoneId: null, poses: [], animations: [] });
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

  // Reset
  reset: () => set(createInitialSkeletonState()),
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
