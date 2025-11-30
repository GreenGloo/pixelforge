'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSkeletonStore } from '@/lib/skeleton/useSkeletonStore';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { getBoneWorldPosition, BoneTransform, createDefaultTransform } from '@/lib/skeleton/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Bone as BoneIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  User,
  Download,
  ChevronDown,
  ChevronRight,
  Save,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SkeletonPanel() {
  const { width, height } = useCanvasStore();
  const {
    bones,
    selectedBoneId,
    showBones,
    poses,
    animations,
    currentAnimationId,
    isAnimating,
    addBone,
    removeBone,
    selectBone,
    updateBone,
    loadHumanoidSkeleton,
    clearSkeleton,
    toggleShowBones,
    addPose,
    applyPose,
    savePoseFromCurrent,
    addAnimation,
    selectAnimation,
    addKeyframe,
    setIsAnimating,
    exportSkeleton,
    reset,
  } = useSkeletonStore();

  const [currentTransforms, setCurrentTransforms] = useState<Record<string, BoneTransform>>({});
  const [newBoneName, setNewBoneName] = useState('');
  const [newPoseName, setNewPoseName] = useState('');
  const [isBonesExpanded, setIsBonesExpanded] = useState(true);
  const [isPosesExpanded, setIsPosesExpanded] = useState(true);
  const [isAnimExpanded, setIsAnimExpanded] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  const selectedBone = bones.find(b => b.id === selectedBoneId);

  // Initialize transforms
  useEffect(() => {
    const transforms: Record<string, BoneTransform> = {};
    for (const bone of bones) {
      transforms[bone.id] = currentTransforms[bone.id] || createDefaultTransform();
    }
    setCurrentTransforms(transforms);
  }, [bones.length]);

  // Get hierarchy for tree view
  const getBoneChildren = useCallback((parentId: string | null) => {
    return bones.filter(b => b.parentId === parentId);
  }, [bones]);

  const handleTransformChange = (boneId: string, key: keyof BoneTransform, value: number) => {
    setCurrentTransforms(prev => ({
      ...prev,
      [boneId]: {
        ...prev[boneId],
        [key]: value,
      },
    }));
  };

  const handleSavePose = () => {
    if (!newPoseName.trim()) return;
    savePoseFromCurrent(newPoseName, currentTransforms);
    setNewPoseName('');
  };

  const handleApplyPose = (poseId: string) => {
    const transforms = applyPose(poseId);
    setCurrentTransforms(transforms);
  };

  const handleResetPose = () => {
    const transforms: Record<string, BoneTransform> = {};
    for (const bone of bones) {
      transforms[bone.id] = createDefaultTransform();
    }
    setCurrentTransforms(transforms);
  };

  const renderBoneTree = (parentId: string | null, depth: number = 0): JSX.Element[] => {
    const children = getBoneChildren(parentId);

    return children.flatMap(bone => {
      const isSelected = bone.id === selectedBoneId;
      const hasChildren = getBoneChildren(bone.id).length > 0;

      return [
        <div
          key={bone.id}
          className={cn(
            'flex items-center gap-2 py-1 px-2 cursor-pointer rounded text-sm',
            isSelected ? 'bg-purple-600/30' : 'hover:bg-[#252540]'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => selectBone(bone.id)}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: bone.color }}
          />
          <span className="flex-1 truncate">{bone.name}</span>
          {isSelected && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                removeBone(bone.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>,
        ...renderBoneTree(bone.id, depth + 1),
      ];
    });
  };

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <BoneIcon className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-sm">Skeleton Rigging</span>
        <div className="flex-1" />
        <Switch
          checked={showBones}
          onCheckedChange={toggleShowBones}
          className="scale-75"
        />
      </div>

      <ScrollArea className="h-64">
        <div className="p-3 space-y-3">
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={loadHumanoidSkeleton}
            >
              <User className="w-3 h-3 mr-1" /> Humanoid
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const json = exportSkeleton();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'skeleton.json';
                a.click();
              }}
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-red-400"
              onClick={clearSkeleton}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Bones section */}
          <Collapsible open={isBonesExpanded} onOpenChange={setIsBonesExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isBonesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Bones ({bones.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="bg-[#0f0f1a] rounded p-1 space-y-0.5 max-h-32 overflow-y-auto">
                {bones.length === 0 ? (
                  <p className="text-xs text-gray-500 p-2 text-center">
                    No bones. Load preset or add manually.
                  </p>
                ) : (
                  renderBoneTree(null)
                )}
              </div>

              {/* Add new bone */}
              <div className="flex gap-1 mt-2">
                <Input
                  placeholder="Bone name..."
                  value={newBoneName}
                  onChange={(e) => setNewBoneName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    const name = newBoneName || `bone_${bones.length + 1}`;
                    addBone(name, selectedBoneId, width / 2, height / 2);
                    setNewBoneName('');
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Selected bone controls */}
          {selectedBone && (
            <div className="bg-[#252540] rounded p-2 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedBone.color }}
                />
                <span className="text-xs font-medium">{selectedBone.name}</span>
              </div>

              <div>
                <label className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Rotation</span>
                  <span>{Math.round(currentTransforms[selectedBone.id]?.rotation || 0)}°</span>
                </label>
                <Slider
                  value={[currentTransforms[selectedBone.id]?.rotation || 0]}
                  onValueChange={([v]) => handleTransformChange(selectedBone.id, 'rotation', v)}
                  min={-180}
                  max={180}
                  step={1}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">X Offset</label>
                  <Input
                    type="number"
                    value={currentTransforms[selectedBone.id]?.x || 0}
                    onChange={(e) => handleTransformChange(selectedBone.id, 'x', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Y Offset</label>
                  <Input
                    type="number"
                    value={currentTransforms[selectedBone.id]?.y || 0}
                    onChange={(e) => handleTransformChange(selectedBone.id, 'y', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Poses section */}
          <Collapsible open={isPosesExpanded} onOpenChange={setIsPosesExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isPosesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Poses ({poses.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleResetPose}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
                {poses.map(pose => (
                  <Button
                    key={pose.id}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleApplyPose(pose.id)}
                  >
                    {pose.name}
                  </Button>
                ))}
              </div>

              <div className="flex gap-1">
                <Input
                  placeholder="Pose name..."
                  value={newPoseName}
                  onChange={(e) => setNewPoseName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleSavePose}
                  disabled={!newPoseName.trim()}
                >
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Animations section */}
          <Collapsible open={isAnimExpanded} onOpenChange={setIsAnimExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isAnimExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Animations ({animations.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex gap-1 flex-wrap">
                {animations.map(anim => (
                  <Button
                    key={anim.id}
                    variant={currentAnimationId === anim.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => selectAnimation(anim.id)}
                  >
                    {anim.name}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    const name = prompt('Animation name:');
                    if (name) addAnimation(name);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {currentAnimationId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7"
                    onClick={() => setIsAnimating(!isAnimating)}
                  >
                    {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const time = prompt('Keyframe time (ms):');
                      if (time) addKeyframe(currentAnimationId, parseInt(time), currentTransforms);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Keyframe
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
