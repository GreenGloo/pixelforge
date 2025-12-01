'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSkeletonStore } from '@/lib/skeleton/useSkeletonStore';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { getBoneWorldPosition, BoneTransform, createDefaultTransform } from '@/lib/skeleton/types';
import { getTransformsAtTime } from '@/lib/skeleton/animationTemplates';
import { describePose } from '@/lib/skeleton/skeletonRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Bone as BoneIcon,
  Plus,
  Trash2,
  User,
  Download,
  ChevronDown,
  ChevronRight,
  Save,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  Wand2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function SkeletonPanel() {
  const { data: session } = useSession();
  const { width, height, loadFromUrl } = useCanvasStore();
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
    loadAnimationTemplate,
    reset,
  } = useSkeletonStore();

  const [currentTransforms, setCurrentTransforms] = useState<Record<string, BoneTransform>>({});
  const [newBoneName, setNewBoneName] = useState('');
  const [newPoseName, setNewPoseName] = useState('');
  const [isBonesExpanded, setIsBonesExpanded] = useState(true);
  const [isPosesExpanded, setIsPosesExpanded] = useState(true);
  const [isAnimExpanded, setIsAnimExpanded] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Dialog states (replacing browser prompts)
  const [showAnimDialog, setShowAnimDialog] = useState(false);
  const [showKeyframeDialog, setShowKeyframeDialog] = useState(false);
  const [newAnimName, setNewAnimName] = useState('');
  const [newKeyframeTime, setNewKeyframeTime] = useState(0);

  // Animation playback
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // AI Generation states
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [aiCharacterPrompt, setAICharacterPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);

  const selectedBone = bones.find(b => b.id === selectedBoneId);
  const currentAnimation = animations.find(a => a.id === currentAnimationId);

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

  // Animation playback effect
  useEffect(() => {
    if (isAnimating && currentAnimation) {
      const duration = currentAnimation.duration;
      const startTime = Date.now() - animationTime;

      animationRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) * playbackSpeed;
        const loopedTime = currentAnimation.loop
          ? elapsed % duration
          : Math.min(elapsed, duration);

        setAnimationTime(loopedTime);

        // Update transforms based on animation
        if (currentAnimation.keyframes.length > 0) {
          const interpolatedTransforms = getTransformsAtTime(currentAnimation, loopedTime);
          setCurrentTransforms(interpolatedTransforms);
        }
      }, 16); // ~60fps
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isAnimating, currentAnimation, playbackSpeed]);

  // Handle creating new animation
  const handleCreateAnimation = () => {
    if (!newAnimName.trim()) {
      toast.error('Please enter an animation name');
      return;
    }
    addAnimation(newAnimName);
    setNewAnimName('');
    setShowAnimDialog(false);
    toast.success(`Animation "${newAnimName}" created`);
  };

  // Handle adding keyframe
  const handleAddKeyframe = () => {
    if (!currentAnimationId) return;
    if (newKeyframeTime < 0) {
      toast.error('Keyframe time must be positive');
      return;
    }
    addKeyframe(currentAnimationId, newKeyframeTime, currentTransforms);
    setShowKeyframeDialog(false);
    toast.success(`Keyframe added at ${newKeyframeTime}ms`);
  };

  // Generate AI sprites from skeleton animation
  const handleGenerateFromSkeleton = async () => {
    if (!session?.user) {
      toast.error('Please sign in to generate');
      return;
    }
    if (!aiCharacterPrompt.trim()) {
      toast.error('Please describe your character');
      return;
    }
    if (!currentAnimation) {
      toast.error('Please select an animation first');
      return;
    }

    setIsGeneratingAI(true);
    setGeneratedFrames([]);

    try {
      // Generate pose descriptions from current animation keyframes
      const poseDescriptions = currentAnimation.keyframes.map((kf, i) => {
        // Use describePose if available, otherwise create a basic description
        const poseDesc = describePose ? describePose(bones, kf.boneTransforms) : `pose frame ${i + 1}`;
        return poseDesc;
      });

      // If no keyframes, use current pose
      if (poseDescriptions.length === 0) {
        const currentDesc = describePose ? describePose(bones, currentTransforms) : 'standing pose';
        poseDescriptions.push(currentDesc);
      }

      const response = await fetch('/api/skeleton-animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterPrompt: aiCharacterPrompt,
          poseDescriptions,
          width: 64,
          height: 64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Insufficient credits. Need ${data.required}, have ${data.available}`);
        } else {
          toast.error(data.error || 'Generation failed');
        }
        return;
      }

      setGeneratedFrames(data.frames);
      toast.success(`Generated ${data.frames.length} frames! Used ${data.creditsUsed} credits`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate sprites');
    } finally {
      setIsGeneratingAI(false);
    }
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
              {/* Animation templates */}
              {bones.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-500">Load Template:</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {['idle', 'walk', 'run', 'attack', 'jump'].map((template) => (
                      <Button
                        key={template}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs capitalize bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40"
                        onClick={() => {
                          loadAnimationTemplate(template as 'idle' | 'walk' | 'run' | 'attack' | 'jump');
                          toast.success(`${template} animation loaded`);
                        }}
                      >
                        {template}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing animations */}
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
                  onClick={() => setShowAnimDialog(true)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* Animation controls & timeline */}
              {currentAnimation && (
                <div className="bg-[#0f0f1a] rounded p-2 space-y-2">
                  {/* Playback controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isAnimating ? 'default' : 'ghost'}
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => setIsAnimating(!isAnimating)}
                    >
                      {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => {
                        setAnimationTime(0);
                        handleResetPose();
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <div className="flex-1 text-xs text-gray-400 text-right">
                      {Math.round(animationTime)}ms / {currentAnimation.duration}ms
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] text-gray-500">Timeline</span>
                    </div>
                    <div className="relative h-6 bg-[#1a1a2e] rounded">
                      {/* Timeline track */}
                      <div
                        className="absolute top-0 left-0 h-full bg-purple-600/30 rounded"
                        style={{ width: `${(animationTime / currentAnimation.duration) * 100}%` }}
                      />
                      {/* Keyframe markers */}
                      {currentAnimation.keyframes.map((kf, i) => (
                        <div
                          key={i}
                          className="absolute top-1 bottom-1 w-1 bg-yellow-500 rounded cursor-pointer hover:bg-yellow-400"
                          style={{ left: `${(kf.time / currentAnimation.duration) * 100}%` }}
                          title={`Keyframe at ${kf.time}ms`}
                          onClick={() => {
                            setAnimationTime(kf.time);
                            setCurrentTransforms(kf.boneTransforms);
                          }}
                        />
                      ))}
                      {/* Scrubber */}
                      <input
                        type="range"
                        min={0}
                        max={currentAnimation.duration}
                        value={animationTime}
                        onChange={(e) => {
                          const time = parseInt(e.target.value);
                          setAnimationTime(time);
                          setIsAnimating(false);
                          // Interpolate transforms at this time
                          const interpolated = getTransformsAtTime(currentAnimation, time);
                          setCurrentTransforms(interpolated);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-600">
                      <span>0ms</span>
                      <span>{currentAnimation.duration}ms</span>
                    </div>
                  </div>

                  {/* Keyframe actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs flex-1"
                      onClick={() => {
                        setNewKeyframeTime(Math.round(animationTime));
                        setShowKeyframeDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Keyframe
                    </Button>
                  </div>

                  {/* Keyframe list */}
                  {currentAnimation.keyframes.length > 0 && (
                    <div className="text-[10px] text-gray-500">
                      {currentAnimation.keyframes.length} keyframe{currentAnimation.keyframes.length !== 1 ? 's' : ''}:
                      {currentAnimation.keyframes.map(kf => ` ${kf.time}ms`).join(',')}
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* AI Generation section */}
          <Collapsible open={isAIExpanded} onOpenChange={setIsAIExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isAIExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Wand2 className="w-3 h-3 text-purple-400" />
              AI Generate from Pose
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="bg-[#0f0f1a] rounded p-2 space-y-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Character Description
                  </label>
                  <Textarea
                    placeholder="e.g., knight with blue armor, wizard with staff..."
                    value={aiCharacterPrompt}
                    onChange={(e) => setAICharacterPrompt(e.target.value)}
                    className="h-16 text-xs"
                  />
                </div>

                {currentAnimation && currentAnimation.keyframes.length > 0 && (
                  <p className="text-[10px] text-gray-500">
                    Will generate {currentAnimation.keyframes.length} frame{currentAnimation.keyframes.length !== 1 ? 's' : ''} from animation keyframes
                  </p>
                )}

                {!currentAnimation && bones.length > 0 && (
                  <p className="text-[10px] text-yellow-500">
                    Select an animation first, or current pose will be used
                  </p>
                )}

                <Button
                  className="w-full h-7 text-xs bg-gradient-to-r from-purple-600 to-pink-600"
                  onClick={handleGenerateFromSkeleton}
                  disabled={isGeneratingAI || !aiCharacterPrompt.trim() || bones.length === 0}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generate Sprites
                    </>
                  )}
                </Button>

                {/* Generated frames preview */}
                {generatedFrames.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Generated Frames</label>
                    <div className="flex gap-1 overflow-x-auto p-1 bg-[#1a1a2e] rounded">
                      {generatedFrames.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => loadFromUrl(url)}
                          className="shrink-0 hover:ring-2 hover:ring-purple-500 rounded"
                          title="Click to load on canvas"
                        >
                          <img
                            src={url}
                            alt={`Frame ${i + 1}`}
                            className="h-12 w-12 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 text-center">
                      Click a frame to load on canvas
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Create Animation Dialog */}
      <Dialog open={showAnimDialog} onOpenChange={setShowAnimDialog}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Create Animation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Animation name (e.g., walk_cycle)"
              value={newAnimName}
              onChange={(e) => setNewAnimName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAnimation()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAnimDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAnimation}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Keyframe Dialog */}
      <Dialog open={showKeyframeDialog} onOpenChange={setShowKeyframeDialog}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Add Keyframe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Time (milliseconds)</label>
              <Input
                type="number"
                min={0}
                max={currentAnimation?.duration || 1000}
                value={newKeyframeTime}
                onChange={(e) => setNewKeyframeTime(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyframe()}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Current pose will be saved at this time
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowKeyframeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKeyframe}>
              Add Keyframe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
