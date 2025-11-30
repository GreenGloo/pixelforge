'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Film,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function AnimationTimeline() {
  const {
    frames,
    currentFrameIndex,
    width,
    height,
    onionSkin,
    selectFrame,
    addFrame,
    removeFrame,
    duplicateFrame,
    setFrameDuration,
    moveFrame,
    toggleOnionSkin,
    setOnionSkinSettings,
    getImageData,
  } = useCanvasStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(10);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate thumbnail for a frame
  const getFrameThumbnail = useCallback(
    (frameIndex: number) => {
      const store = useCanvasStore.getState();
      const frame = store.frames[frameIndex];
      if (!frame) return '';

      // Composite frame layers
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      for (const layer of frame.layers) {
        if (!layer.visible) continue;

        ctx.globalAlpha = layer.opacity;
        const imageData = new ImageData(
          new Uint8ClampedArray(layer.pixels),
          width,
          height
        );

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }

      return canvas.toDataURL('image/png');
    },
    [width, height]
  );

  // Animation playback
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / fps;
      playIntervalRef.current = setInterval(() => {
        const store = useCanvasStore.getState();
        const nextIndex = (store.currentFrameIndex + 1) % store.frames.length;
        selectFrame(nextIndex);
      }, interval);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, fps, selectFrame]);

  // Export as GIF or sprite sheet
  const exportSpriteSheet = () => {
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);

    const canvas = document.createElement('canvas');
    canvas.width = width * cols;
    canvas.height = height * rows;
    const ctx = canvas.getContext('2d')!;

    frames.forEach((frame, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      // Draw frame at position
      for (const layer of frame.layers) {
        if (!layer.visible) continue;

        ctx.globalAlpha = layer.opacity;
        const imageData = new ImageData(
          new Uint8ClampedArray(layer.pixels),
          width,
          height
        );

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

        ctx.drawImage(tempCanvas, col * width, row * height);
        ctx.globalAlpha = 1;
      }
    });

    const link = document.createElement('a');
    link.download = `spritesheet-${cols}x${rows}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export as GIF using gif.js
  const exportGif = async () => {
    if (isExportingGif) return;
    setIsExportingGif(true);

    try {
      // Dynamically import gif.js
      const GIF = (await import('gif.js')).default;

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: '/gif.worker.js',
      });

      // Add each frame
      for (const frame of frames) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Fill with transparent/white background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, width, height);

        // Composite frame layers
        for (const layer of frame.layers) {
          if (!layer.visible) continue;

          ctx.globalAlpha = layer.opacity;
          const imageData = new ImageData(
            new Uint8ClampedArray(layer.pixels),
            width,
            height
          );

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1;
        }

        gif.addFrame(canvas, { delay: frame.duration, copy: true });
      }

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `animation-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setIsExportingGif(false);
      });

      gif.render();
    } catch (error) {
      console.error('GIF export error:', error);
      setIsExportingGif(false);
    }
  };

  return (
    <div className="bg-[#1a1a2e] border-t border-[#2a2a4e] p-3">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">FPS:</span>
          <Input
            type="number"
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
            className="w-14 h-7 text-xs"
            min={1}
            max={60}
          />
        </div>

        <div className="flex-1" />

        <span className="text-xs text-gray-400">
          Frame {currentFrameIndex + 1} / {frames.length}
        </span>

        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={addFrame}>
          <Plus className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => duplicateFrame(currentFrameIndex)}
        >
          <Copy className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-red-400 hover:text-red-300"
          onClick={() => removeFrame(currentFrameIndex)}
          disabled={frames.length <= 1}
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {/* Onion Skin Toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={onionSkin.enabled ? 'default' : 'ghost'}
              size="icon"
              className={cn('w-8 h-8', onionSkin.enabled && 'bg-purple-600 hover:bg-purple-700')}
              title="Onion Skinning"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" side="top">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Onion Skinning</span>
                <Switch
                  checked={onionSkin.enabled}
                  onCheckedChange={toggleOnionSkin}
                />
              </div>

              {onionSkin.enabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Frames Before</span>
                      <span className="text-xs text-red-400">{onionSkin.framesBefore}</span>
                    </div>
                    <Slider
                      value={[onionSkin.framesBefore]}
                      onValueChange={([v]) => setOnionSkinSettings({ framesBefore: v })}
                      min={0}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Frames After</span>
                      <span className="text-xs text-blue-400">{onionSkin.framesAfter}</span>
                    </div>
                    <Slider
                      value={[onionSkin.framesAfter]}
                      onValueChange={([v]) => setOnionSkinSettings({ framesAfter: v })}
                      min={0}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Opacity</span>
                      <span className="text-xs">{Math.round(onionSkin.opacityBefore * 100)}%</span>
                    </div>
                    <Slider
                      value={[onionSkin.opacityBefore * 100]}
                      onValueChange={([v]) => setOnionSkinSettings({ opacityBefore: v / 100, opacityAfter: v / 100 })}
                      min={10}
                      max={80}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={exportSpriteSheet}
        >
          <Download className="w-3 h-3 mr-1" /> PNG
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={exportGif}
          disabled={isExportingGif || frames.length < 2}
        >
          <Film className="w-3 h-3 mr-1" /> {isExportingGif ? 'Exporting...' : 'GIF'}
        </Button>
      </div>

      {/* Frame thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className={cn(
              'flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-all',
              index === currentFrameIndex
                ? 'border-purple-500'
                : 'border-transparent hover:border-gray-600'
            )}
            onClick={() => selectFrame(index)}
          >
            <div
              className="w-16 h-16 bg-[#0f0f1a]"
              style={{
                backgroundImage: `url(${getFrameThumbnail(index)})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            />
            <div className="bg-[#252540] px-2 py-1 text-center">
              <span className="text-xs text-gray-400">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Frame duration */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-400">Frame Duration:</span>
        <Input
          type="number"
          value={frames[currentFrameIndex]?.duration || 100}
          onChange={(e) =>
            setFrameDuration(currentFrameIndex, parseInt(e.target.value) || 100)
          }
          className="w-20 h-7 text-xs"
          min={10}
          max={5000}
        />
        <span className="text-xs text-gray-500">ms</span>
      </div>
    </div>
  );
}
