// ==========================================
// Inverse Kinematics Solver
// Uses CCD (Cyclic Coordinate Descent) algorithm
// ==========================================

import { Bone, BoneTransform, getBoneWorldPosition } from './types';

export interface IKChain {
  id: string;
  name: string;
  endEffectorBoneId: string; // The bone that moves toward the target (e.g., hand, foot)
  chainLength: number; // How many bones up the chain to solve
  targetX: number;
  targetY: number;
  enabled: boolean;
  iterations: number; // CCD iterations
  tolerance: number; // Distance threshold to consider "reached"
}

export interface IKConstraint {
  boneId: string;
  minRotation: number; // Degrees
  maxRotation: number; // Degrees
}

// Get the bone chain from end effector up to chainLength parents
export function getBoneChain(
  bones: Bone[],
  endEffectorId: string,
  chainLength: number
): Bone[] {
  const boneMap = new Map(bones.map(b => [b.id, b]));
  const chain: Bone[] = [];

  let current = boneMap.get(endEffectorId);
  for (let i = 0; i < chainLength && current; i++) {
    chain.push(current);
    if (current.parentId) {
      current = boneMap.get(current.parentId);
    } else {
      break;
    }
  }

  return chain;
}

// Calculate distance between two points
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Normalize angle to -180 to 180
function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// Clamp value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// CCD (Cyclic Coordinate Descent) IK Solver
// Returns the transforms needed to reach the target
export function solveIK(
  bones: Bone[],
  chain: IKChain,
  currentTransforms: Record<string, BoneTransform>,
  constraints?: IKConstraint[]
): Record<string, BoneTransform> {
  const boneChain = getBoneChain(bones, chain.endEffectorBoneId, chain.chainLength);

  if (boneChain.length === 0) {
    return currentTransforms;
  }

  // Create a working copy of transforms
  const newTransforms: Record<string, BoneTransform> = { ...currentTransforms };

  // Initialize transforms for bones that don't have them
  for (const bone of boneChain) {
    if (!newTransforms[bone.id]) {
      newTransforms[bone.id] = {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
    }
  }

  const constraintMap = new Map(constraints?.map(c => [c.boneId, c]) || []);

  // CCD iterations
  for (let iter = 0; iter < chain.iterations; iter++) {
    // Get end effector position
    const endBone = boneChain[0];
    const endPos = getBoneWorldPosition(endBone, bones, newTransforms);

    // Check if we're close enough
    const dist = distance(endPos.x, endPos.y, chain.targetX, chain.targetY);
    if (dist < chain.tolerance) {
      break;
    }

    // Work from end effector toward root (skip end effector itself)
    for (let i = 1; i < boneChain.length; i++) {
      const bone = boneChain[i];
      const bonePos = getBoneWorldPosition(bone, bones, newTransforms);

      // Calculate angle from this bone to end effector
      const toEnd = Math.atan2(
        endPos.y - bonePos.y,
        endPos.x - bonePos.x
      ) * 180 / Math.PI;

      // Calculate angle from this bone to target
      const toTarget = Math.atan2(
        chain.targetY - bonePos.y,
        chain.targetX - bonePos.x
      ) * 180 / Math.PI;

      // Calculate rotation needed
      let deltaRotation = normalizeAngle(toTarget - toEnd);

      // Apply constraints
      const constraint = constraintMap.get(bone.id);
      if (constraint) {
        const currentRotation = newTransforms[bone.id].rotation;
        const newRotation = clamp(
          currentRotation + deltaRotation,
          constraint.minRotation,
          constraint.maxRotation
        );
        deltaRotation = newRotation - currentRotation;
      }

      // Apply rotation
      newTransforms[bone.id] = {
        ...newTransforms[bone.id],
        rotation: newTransforms[bone.id].rotation + deltaRotation,
      };

      // Update end effector position for next iteration
      const newEndPos = getBoneWorldPosition(endBone, bones, newTransforms);
      endPos.x = newEndPos.x;
      endPos.y = newEndPos.y;

      // Early exit if close enough
      if (distance(endPos.x, endPos.y, chain.targetX, chain.targetY) < chain.tolerance) {
        break;
      }
    }
  }

  return newTransforms;
}

// FABRIK (Forward And Backward Reaching Inverse Kinematics) - alternative solver
// Good for longer chains and more natural-looking results
export function solveFABRIK(
  bones: Bone[],
  chain: IKChain,
  currentTransforms: Record<string, BoneTransform>
): Record<string, BoneTransform> {
  const boneChain = getBoneChain(bones, chain.endEffectorBoneId, chain.chainLength);

  if (boneChain.length < 2) {
    return currentTransforms;
  }

  // Get joint positions
  const positions: { x: number; y: number }[] = [];
  for (const bone of boneChain) {
    const pos = getBoneWorldPosition(bone, bones, currentTransforms);
    positions.push({ x: pos.x, y: pos.y });
  }

  // Get segment lengths
  const lengths: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    lengths.push(distance(
      positions[i].x, positions[i].y,
      positions[i + 1].x, positions[i + 1].y
    ));
  }

  const target = { x: chain.targetX, y: chain.targetY };
  const root = positions[positions.length - 1];

  for (let iter = 0; iter < chain.iterations; iter++) {
    // Check if target is reachable
    const distToTarget = distance(positions[0].x, positions[0].y, target.x, target.y);
    if (distToTarget < chain.tolerance) {
      break;
    }

    // Backward reaching (from end effector to root)
    positions[0] = { ...target };
    for (let i = 0; i < positions.length - 1; i++) {
      const dir = {
        x: positions[i + 1].x - positions[i].x,
        y: positions[i + 1].y - positions[i].y,
      };
      const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
      if (len > 0) {
        const scale = lengths[i] / len;
        positions[i + 1] = {
          x: positions[i].x + dir.x * scale,
          y: positions[i].y + dir.y * scale,
        };
      }
    }

    // Forward reaching (from root to end effector)
    positions[positions.length - 1] = { ...root };
    for (let i = positions.length - 2; i >= 0; i--) {
      const dir = {
        x: positions[i].x - positions[i + 1].x,
        y: positions[i].y - positions[i + 1].y,
      };
      const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
      if (len > 0) {
        const scale = lengths[i] / len;
        positions[i] = {
          x: positions[i + 1].x + dir.x * scale,
          y: positions[i + 1].y + dir.y * scale,
        };
      }
    }
  }

  // Convert positions back to bone transforms (rotations)
  const newTransforms: Record<string, BoneTransform> = { ...currentTransforms };

  for (let i = boneChain.length - 1; i > 0; i--) {
    const bone = boneChain[i];
    const childPos = positions[i - 1];
    const bonePos = positions[i];

    // Calculate required rotation to point at child
    const targetAngle = Math.atan2(
      childPos.y - bonePos.y,
      childPos.x - bonePos.x
    ) * 180 / Math.PI;

    // Get parent's world rotation
    let parentWorldRotation = 0;
    if (bone.parentId) {
      const parentPos = getBoneWorldPosition(
        bones.find(b => b.id === bone.parentId)!,
        bones,
        newTransforms
      );
      parentWorldRotation = parentPos.rotation;
    }

    // Calculate local rotation needed
    const localRotation = targetAngle - parentWorldRotation - bone.rotation;

    newTransforms[bone.id] = {
      ...(newTransforms[bone.id] || { x: 0, y: 0, scaleX: 1, scaleY: 1 }),
      rotation: normalizeAngle(localRotation),
    };
  }

  return newTransforms;
}

// Create a default IK chain for common limbs
export function createIKChain(
  name: string,
  endEffectorBoneId: string,
  chainLength: number = 3
): IKChain {
  return {
    id: crypto.randomUUID(),
    name,
    endEffectorBoneId,
    chainLength,
    targetX: 0,
    targetY: 0,
    enabled: true,
    iterations: 10,
    tolerance: 0.5,
  };
}

// Common constraint presets
export const CONSTRAINT_PRESETS = {
  elbow: { minRotation: 0, maxRotation: 145 }, // Elbow can't bend backwards
  knee: { minRotation: -145, maxRotation: 0 }, // Knee bends opposite direction
  shoulder: { minRotation: -180, maxRotation: 180 }, // Full rotation
  hip: { minRotation: -90, maxRotation: 90 }, // Limited hip rotation
  spine: { minRotation: -30, maxRotation: 30 }, // Limited spine rotation
};

// Create constraints for humanoid skeleton
export function createHumanoidConstraints(
  bones: Bone[],
  boneNameToId: Map<string, string>
): IKConstraint[] {
  const constraints: IKConstraint[] = [];

  // Arm constraints
  const elbowNames = ['lower_arm_L', 'lower_arm_R'];
  for (const name of elbowNames) {
    const id = boneNameToId.get(name);
    if (id) {
      constraints.push({ boneId: id, ...CONSTRAINT_PRESETS.elbow });
    }
  }

  // Leg constraints
  const kneeNames = ['lower_leg_L', 'lower_leg_R'];
  for (const name of kneeNames) {
    const id = boneNameToId.get(name);
    if (id) {
      constraints.push({ boneId: id, ...CONSTRAINT_PRESETS.knee });
    }
  }

  // Shoulder constraints
  const shoulderNames = ['upper_arm_L', 'upper_arm_R'];
  for (const name of shoulderNames) {
    const id = boneNameToId.get(name);
    if (id) {
      constraints.push({ boneId: id, ...CONSTRAINT_PRESETS.shoulder });
    }
  }

  return constraints;
}
