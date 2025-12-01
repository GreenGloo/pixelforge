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

  // Cost: 4 credits for 4 animation frames
  const cost = 4;

  // Store individual frame URLs
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [frameImages, setFrameImages] = useState<HTMLImageElement[]>([]);

  // Load individual frame images
  useEffect(() => {
    if (frameUrls.length > 0) {
      const images: HTMLImageElement[] = [];
      let loadedCount = 0;

      frameUrls.forEach((url, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          images[index] = img;
          loadedCount++;
          if (loadedCount === frameUrls.length) {
            setFrameImages(images);
            setCurrentFrameIndex(0);
            drawFrameFromImages(0, images);
          }
        };
        img.src = url;
      });
    }
  }, [frameUrls]);

  // Animation playback with individual frames
  useEffect(() => {
    if (isPlaying && frameImages.length > 0) {
      animationRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % frameImages.length;
          drawFrameFromImages(next, frameImages);
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
  }, [isPlaying, frameImages, fps]);

  // Draw a single frame from individual images
  const drawFrameFromImages = useCallback((frameIndex: number, images: HTMLImageElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0 || !images[frameIndex]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[frameIndex];
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, img.width, img.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
  }, []);

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
    setFrameUrls([]);
    setFrameImages([]);
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

      toast.success(`Animation generated! Used ${data.creditsUsed} credits`);

      // Handle individual frames from the API
      if (data.frames && data.frames.length > 0) {
        setFrameUrls(data.frames);
        setFrameCount(data.frames.length);
      } else if (data.spriteSheetUrl) {
        // Fallback for sprite sheet format
        setSpriteSheetUrl(data.spriteSheetUrl);
        setFrameCount(data.frameCount);
      }

      setIsPlaying(true);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate sprite sheet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = useCallback(async () => {
    // If we have individual frame images, create a sprite sheet
    if (frameImages.length > 0) {
      const firstFrame = frameImages[0];
      const canvas = document.createElement('canvas');
      canvas.width = firstFrame.width * frameImages.length;
      canvas.height = firstFrame.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        frameImages.forEach((img, i) => {
          ctx.drawImage(img, i * firstFrame.width, 0);
        });

        const link = document.createElement('a');
        link.download = `sprite-sheet-${motionType}-${frameImages.length}frames.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Sprite sheet downloaded!');
      }
      return;
    }

    // Fallback: download sprite sheet URL as blob
    if (spriteSheetUrl) {
      try {
        const response = await fetch(spriteSheetUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `sprite-sheet-${motionType}-${frameCount}frames.png`;
        link.href = blobUrl;
        link.click();
        URL.revokeObjectURL(blobUrl);
        toast.success('Sprite sheet downloaded!');
      } catch {
        toast.error('Failed to download sprite sheet');
      }
    }
  }, [frameImages, spriteSheetUrl, motionType, frameCount]);

  const selectFrame = (index: number) => {
    setCurrentFrameIndex(index);
    setIsPlaying(false);
    if (frameImages.length > 0) {
      drawFrameFromImages(index, frameImages);
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
        {(frameImages.length > 0 || spriteSheetUrl) && (
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
              {Array.from({ length: frameImages.length || frameCount }).map((_, index) => (
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

            {/* Individual frames preview */}
            {frameUrls.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block">Animation Frames</label>
                <div className="bg-[#0f0f1a] rounded p-2 flex gap-1 overflow-x-auto">
                  {frameUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Frame ${i + 1}`}
                      className="h-16 w-auto cursor-pointer hover:ring-2 hover:ring-purple-500"
                      style={{ imageRendering: 'pixelated' }}
                      onClick={() => selectFrame(i)}
                    />
                  ))}
                </div>
              </div>
            )}

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
