'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSkeletonStore } from '@/lib/skeleton/useSkeletonStore';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { getBoneWorldPosition, BoneTransform, createDefaultTransform } from '@/lib/skeleton/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bone as BoneIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  User,
  Download,
  Upload,
  Save,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function BoneEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height, zoom } = useCanvasStore();
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
    addAnimation,
    selectAnimation,
    addKeyframe,
    setIsAnimating,
    exportSkeleton,
  } = useSkeletonStore();

  const [currentTransforms, setCurrentTransforms] = useState<Record<string, BoneTransform>>({});
  const [newBoneName, setNewBoneName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'rotate'>('move');
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number | null>(null);

  const selectedBone = bones.find(b => b.id === selectedBoneId);

  // Initialize transforms for all bones
  useEffect(() => {
    const transforms: Record<string, BoneTransform> = {};
    for (const bone of bones) {
      if (!currentTransforms[bone.id]) {
        transforms[bone.id] = createDefaultTransform();
      } else {
        transforms[bone.id] = currentTransforms[bone.id];
      }
    }
    setCurrentTransforms(transforms);
  }, [bones]);

  // Render bones on canvas overlay
  const renderBones = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showBones) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = width * zoom;
    const displayHeight = height * zoom;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw each bone
    for (const bone of bones) {
      const worldPos = getBoneWorldPosition(bone, bones, currentTransforms);

      // Calculate end point based on length and rotation
      const rad = (worldPos.rotation * Math.PI) / 180;
      const endX = worldPos.x + Math.cos(rad) * bone.length;
      const endY = worldPos.y + Math.sin(rad) * bone.length;

      // Scale to display
      const startX = worldPos.x * zoom;
      const startY = worldPos.y * zoom;
      const scaledEndX = endX * zoom;
      const scaledEndY = endY * zoom;

      // Draw bone line
      ctx.beginPath();
      ctx.strokeStyle = bone.color;
      ctx.lineWidth = bone.id === selectedBoneId ? 3 : 2;
      ctx.moveTo(startX, startY);
      ctx.lineTo(scaledEndX, scaledEndY);
      ctx.stroke();

      // Draw joint circle at start
      ctx.beginPath();
      ctx.fillStyle = bone.id === selectedBoneId ? '#ffffff' : bone.color;
      ctx.arc(startX, startY, bone.id === selectedBoneId ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw small circle at end
      ctx.beginPath();
      ctx.fillStyle = bone.color;
      ctx.arc(scaledEndX, scaledEndY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [bones, currentTransforms, selectedBoneId, showBones, width, height, zoom]);

  useEffect(() => {
    renderBones();
  }, [renderBones]);

  // Animation loop
  useEffect(() => {
    if (isAnimating && currentAnimationId) {
      const animation = animations.find(a => a.id === currentAnimationId);
      if (!animation || animation.keyframes.length < 2) return;

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        let time = elapsed % animation.duration;

        if (!animation.loop && elapsed >= animation.duration) {
          setIsAnimating(false);
          return;
        }

        setAnimationTime(time);

        // Find keyframes to interpolate between
        const keyframes = animation.keyframes;
        let startFrame = keyframes[0];
        let endFrame = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
          if (time >= keyframes[i].time && time < keyframes[i + 1].time) {
            startFrame = keyframes[i];
            endFrame = keyframes[i + 1];
            break;
          }
        }

        // Calculate interpolation factor
        const duration = endFrame.time - startFrame.time;
        const t = duration > 0 ? (time - startFrame.time) / duration : 0;

        // Interpolate transforms
        const newTransforms: Record<string, BoneTransform> = {};
        for (const bone of bones) {
          const startT = startFrame.boneTransforms[bone.id] || createDefaultTransform();
          const endT = endFrame.boneTransforms[bone.id] || createDefaultTransform();

          newTransforms[bone.id] = {
            x: startT.x + (endT.x - startT.x) * t,
            y: startT.y + (endT.y - startT.y) * t,
            rotation: startT.rotation + (endT.rotation - startT.rotation) * t,
            scaleX: startT.scaleX + (endT.scaleX - startT.scaleX) * t,
            scaleY: startT.scaleY + (endT.scaleY - startT.scaleY) * t,
          };
        }

        setCurrentTransforms(newTransforms);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isAnimating, currentAnimationId, animations, bones]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on a bone joint
    for (const bone of bones) {
      const worldPos = getBoneWorldPosition(bone, bones, currentTransforms);
      const dist = Math.sqrt((worldPos.x - x) ** 2 + (worldPos.y - y) ** 2);

      if (dist < 8 / zoom) {
        selectBone(bone.id);
        return;
      }
    }

    // If shift is held and a bone is selected, add new child bone
    if (e.shiftKey && selectedBoneId) {
      const name = newBoneName || `bone_${bones.length + 1}`;
      addBone(name, selectedBoneId, x - (selectedBone?.x || 0), y - (selectedBone?.y || 0));
      setNewBoneName('');
    }

    selectBone(null);
  };

  // Handle bone transform changes
  const handleTransformChange = (key: keyof BoneTransform, value: number) => {
    if (!selectedBoneId) return;

    setCurrentTransforms(prev => ({
      ...prev,
      [selectedBoneId]: {
        ...prev[selectedBoneId],
        [key]: value,
      },
    }));
  };

  const handleSavePose = () => {
    const name = prompt('Pose name:');
    if (name) {
      useSkeletonStore.getState().savePoseFromCurrent(name, currentTransforms);
    }
  };

  const handleAddKeyframe = () => {
    if (!currentAnimationId) return;
    const time = prompt('Keyframe time (ms):');
    if (time) {
      addKeyframe(currentAnimationId, parseInt(time), currentTransforms);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Canvas overlay for bone visualization */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-auto cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Bone controls panel */}
      <div className="bg-[#1a1a2e] border-t border-[#2a2a4e] p-3 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={toggleShowBones}
              >
                {showBones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle bone visibility</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={loadHumanoidSkeleton}
              >
                <User className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Load humanoid skeleton</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-red-400"
                onClick={clearSkeleton}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear skeleton</TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
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
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>

        {/* Selected bone info */}
        {selectedBone && (
          <div className="space-y-2 p-2 bg-[#252540] rounded">
            <div className="flex items-center gap-2">
              <BoneIcon className="w-4 h-4" style={{ color: selectedBone.color }} />
              <span className="text-sm font-medium">{selectedBone.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 ml-auto text-red-400"
                onClick={() => removeBone(selectedBone.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">Rotation</label>
                <Slider
                  value={[currentTransforms[selectedBone.id]?.rotation || 0]}
                  onValueChange={([v]) => handleTransformChange('rotation', v)}
                  min={-180}
                  max={180}
                  step={1}
                />
              </div>
              <div className="text-xs text-gray-400 self-end">
                {Math.round(currentTransforms[selectedBone.id]?.rotation || 0)}°
              </div>
            </div>
          </div>
        )}

        {/* Poses section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Poses</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleSavePose}
            >
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {poses.map(pose => (
              <Button
                key={pose.id}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setCurrentTransforms(applyPose(pose.id))}
              >
                {pose.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Animations section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Animations</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                const name = prompt('Animation name:');
                if (name) addAnimation(name);
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>

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
          </div>

          {currentAnimationId && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setIsAnimating(!isAnimating)}
              >
                {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddKeyframe}
              >
                <Plus className="w-3 h-3 mr-1" /> Keyframe
              </Button>
              <span className="text-xs text-gray-400 ml-auto">
                {Math.round(animationTime)}ms
              </span>
            </div>
          )}
        </div>

        {/* Add new bone */}
        <div className="flex gap-2">
          <Input
            placeholder="New bone name..."
            value={newBoneName}
            onChange={(e) => setNewBoneName(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs whitespace-nowrap"
            onClick={() => {
              const name = newBoneName || `bone_${bones.length + 1}`;
              addBone(name, selectedBoneId, width / 2, height / 2);
              setNewBoneName('');
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Shift+click on canvas to add child bone
        </p>
      </div>
    </div>
  );
}
