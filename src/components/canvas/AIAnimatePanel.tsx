'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles, Play, Pause, Download } from 'lucide-react';

const MOTION_TYPES = [
  { value: 'walk', label: 'Walk Cycle' },
  { value: 'run', label: 'Run Cycle' },
  { value: 'idle', label: 'Idle' },
  { value: 'attack', label: 'Attack' },
  { value: 'jump', label: 'Jump' },
];

const DIRECTIONS = [
  { value: 'right', label: 'Right (Side)' },
  { value: 'left', label: 'Left (Side)' },
  { value: 'down', label: 'Front' },
  { value: 'up', label: 'Back' },
];

const FRAME_COUNTS = [4, 6, 8];

export function AIAnimatePanel() {
  const { data: session } = useSession();

  const [prompt, setPrompt] = useState('');
  const [motionType, setMotionType] = useState('walk');
  const [direction, setDirection] = useState('right');
  const [numFrames, setNumFrames] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sprite sheet state
  const [spriteSheetUrl, setSpriteSheetUrl] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);

  // Cost: 4 credits for 4 animation frames
  const cost = 4;

  // Load sprite sheet image
  useEffect(() => {
    if (spriteSheetUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        spriteImageRef.current = img;
        setCurrentFrameIndex(0);
        drawFrame(0, img);
      };
      img.src = spriteSheetUrl;
    }
  }, [spriteSheetUrl, frameCount]);

  // Animation playback
  useEffect(() => {
    if (isPlaying && frameCount > 0 && spriteImageRef.current) {
      animationRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % frameCount;
          if (spriteImageRef.current) {
            drawFrame(next, spriteImageRef.current);
          }
          return next;
        });
      }, 1000 / fps);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, frameCount, fps]);

  // Draw a single frame from the sprite sheet
  const drawFrame = useCallback((frameIndex: number, img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !img || frameCount === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameWidth = img.width / frameCount;
    const frameHeight = img.height;

    // Set canvas size to match frame
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // Clear and draw the specific frame
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    ctx.imageSmoothingEnabled = false; // Keep pixels crisp
    ctx.drawImage(
      img,
      frameIndex * frameWidth, 0, frameWidth, frameHeight,
      0, 0, frameWidth, frameHeight
    );
  }, [frameCount]);

  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error('Please sign in to generate animations');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please describe your character');
      return;
    }

    setIsGenerating(true);
    setSpriteSheetUrl(null);
    setFrameCount(0);
    setCurrentFrameIndex(0);
    setIsPlaying(false);

    try {
      const response = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          numFrames,
          motionType,
          direction,
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

      toast.success(`Sprite sheet generated! Used ${data.creditsUsed} credits`);
      setSpriteSheetUrl(data.spriteSheetUrl);
      setFrameCount(data.frameCount);
      setIsPlaying(true);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate sprite sheet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!spriteSheetUrl) return;

    const link = document.createElement('a');
    link.download = `sprite-sheet-${motionType}-${frameCount}frames.png`;
    link.href = spriteSheetUrl;
    link.click();
    toast.success('Sprite sheet downloaded!');
  }, [spriteSheetUrl, motionType, frameCount]);

  const selectFrame = (index: number) => {
    setCurrentFrameIndex(index);
    setIsPlaying(false);
    if (spriteImageRef.current) {
      drawFrame(index, spriteImageRef.current);
    }
  };

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold">Sprite Animation</h3>
        {session?.user && (
          <span className="ml-auto text-xs text-gray-400">
            {session.user.credits} credits
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Prompt */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Describe your character
          </label>
          <Textarea
            placeholder="e.g., knight with blue armor and sword, wizard with purple robe, ninja in black"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-16 text-sm"
          />
        </div>

        {/* Motion and Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Animation</label>
            <Select value={motionType} onValueChange={setMotionType}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTION_TYPES.map((motion) => (
                  <SelectItem key={motion.value} value={motion.value}>
                    {motion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Facing Direction
            </label>
            <Select
              value={direction}
              onValueChange={setDirection}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((dir) => (
                  <SelectItem key={dir.value} value={dir.value}>
                    {dir.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-purple-400">
          Generates {numFrames} animation frames for your character
        </p>

        {/* Frame count */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Frames</label>
          <div className="flex gap-1">
            {FRAME_COUNTS.map((count) => (
              <Button
                key={count}
                variant={numFrames === count ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setNumFrames(count)}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>

        {/* Animation Preview */}
        {spriteSheetUrl && (
          <div className="space-y-3">
            <label className="text-xs text-gray-400 block">Preview</label>

            {/* Animated preview canvas */}
            <div className="flex items-center justify-center bg-[#0f0f1a] rounded p-4">
              <canvas
                ref={canvasRef}
                className="max-w-[200px] max-h-[200px]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <div className="flex-1">
                <label className="text-xs text-gray-400">FPS: {fps}</label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full h-1"
                />
              </div>
            </div>

            {/* Frame indicators */}
            <div className="flex gap-1">
              {Array.from({ length: frameCount }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => selectFrame(index)}
                  className={`flex-1 h-2 rounded ${
                    currentFrameIndex === index
                      ? 'bg-purple-500'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Full sprite sheet preview */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">Sprite Sheet</label>
              <div className="bg-[#0f0f1a] rounded p-2 overflow-x-auto">
                <img
                  src={spriteSheetUrl}
                  alt="Sprite sheet"
                  className="h-24 w-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>

            {/* Download button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sprite Sheet
            </Button>
          </div>
        )}

        {/* Generate button */}
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
          onClick={handleGenerate}
          disabled={isGenerating || !session?.user}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating sprite sheet...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Sprite Sheet ({cost} credits)
            </>
          )}
        </Button>

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to generate animations
          </p>
        )}

        <p className="text-xs text-gray-500">
          Generates a horizontal sprite sheet with {numFrames} frames showing the same character in different poses.
        </p>
      </div>
    </div>
  );
}
