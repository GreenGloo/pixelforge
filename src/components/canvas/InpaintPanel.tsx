'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Paintbrush,
  Eraser,
  Loader2,
  Wand2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Palette,
} from 'lucide-react';

// Inpainting model options
type InpaintModel = 'flux-fill' | 'flux-game' | 'retro-diffusion';

const MODEL_OPTIONS: { value: InpaintModel; label: string; description: string }[] = [
  { value: 'flux-fill', label: 'Flux Fill (Best Quality)', description: 'High quality inpainting with excellent mask adherence' },
  { value: 'flux-game', label: 'Flux Game Assets', description: 'Optimized for 2D game sprites and assets' },
  { value: 'retro-diffusion', label: 'Retro Diffusion', description: 'Pixel art native, hybrid approach' },
];

export function InpaintPanel() {
  const { data: session } = useSession();
  const store = useCanvasStore();
  const {
    width,
    height,
    currentFrameIndex,
    frames,
    currentLayerIndex,
    maskData,
    showMask,
    setShowMask,
    clearMask,
    setFrames,
    pushHistory,
    tool,
    setTool,
    maskTool,
    setMaskTool,
    maskBrushSize,
    setMaskBrushSize,
  } = store;

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState(0.85);
  const [model, setModel] = useState<InpaintModel>('flux-fill');
  const [guidance, setGuidance] = useState(30);

  // When selecting a mask tool, also switch the global tool to 'mask'
  const handleMaskToolSelect = (newMaskTool: 'brush' | 'eraser') => {
    setMaskTool(newMaskTool);
    setTool('mask');
  };

  // Get current canvas as base64
  const getCanvasDataUrl = useCallback(() => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame || !currentFrame.layers.length) return null;

    // Create a temporary canvas to composite all layers
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Composite all visible layers
    for (const layer of currentFrame.layers) {
      if (!layer.visible) continue;
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const layerCtx = layerCanvas.getContext('2d');
      if (!layerCtx) continue;

      const imageData = layerCtx.createImageData(width, height);
      imageData.data.set(layer.pixels);
      layerCtx.putImageData(imageData, 0, 0);

      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layerCanvas, 0, 0);
    }

    return canvas.toDataURL('image/png');
  }, [frames, currentFrameIndex, width, height]);

  // Get preprocessed image with masked areas filled with average color
  // This helps RD's img2img regenerate just those areas
  const getPreprocessedImageUrl = useCallback(() => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame || !currentFrame.layers.length || !maskData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // First composite all visible layers
    for (const layer of currentFrame.layers) {
      if (!layer.visible) continue;
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const layerCtx = layerCanvas.getContext('2d');
      if (!layerCtx) continue;

      const imgData = layerCtx.createImageData(width, height);
      imgData.data.set(layer.pixels);
      layerCtx.putImageData(imgData, 0, 0);

      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layerCanvas, 0, 0);
    }

    // Get the composited image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Calculate average color of non-masked pixels for fill
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] === 0) { // Non-masked pixels
        const idx = i * 4;
        if (pixels[idx + 3] > 0) { // Has some opacity
          totalR += pixels[idx];
          totalG += pixels[idx + 1];
          totalB += pixels[idx + 2];
          count++;
        }
      }
    }

    // Fill masked areas with average color (neutral fill for img2img)
    const avgR = count > 0 ? Math.round(totalR / count) : 128;
    const avgG = count > 0 ? Math.round(totalG / count) : 128;
    const avgB = count > 0 ? Math.round(totalB / count) : 128;

    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] > 0) { // Masked pixel
        const idx = i * 4;
        pixels[idx] = avgR;
        pixels[idx + 1] = avgG;
        pixels[idx + 2] = avgB;
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }, [frames, currentFrameIndex, width, height, maskData]);

  // Get mask as base64
  const getMaskDataUrl = useCallback(() => {
    if (!maskData || maskData.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);

    // Convert mask data to white-on-black image
    // White (255) = inpaint area, Black (0) = keep original
    for (let i = 0; i < maskData.length; i++) {
      const idx = i * 4;
      const value = maskData[i] > 0 ? 255 : 0;
      imageData.data[idx] = value;     // R
      imageData.data[idx + 1] = value; // G
      imageData.data[idx + 2] = value; // B
      imageData.data[idx + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }, [maskData, width, height]);

  const handleInpaint = async () => {
    if (!session?.user) {
      setError('Please sign in to use inpainting');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    const originalImageData = getCanvasDataUrl();
    const preprocessedImageData = getPreprocessedImageUrl();
    const maskDataUrl = getMaskDataUrl();

    if (!originalImageData || !preprocessedImageData) {
      setError('No image on canvas');
      return;
    }

    if (!maskDataUrl) {
      setError('Please paint a mask area first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageData: model === 'retro-diffusion' ? preprocessedImageData : originalImageData,
          maskData: maskDataUrl,
          width,
          height,
          strength,
          model,
          guidance,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to inpaint');
      }

      // Load the result and composite only masked areas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw generated image first
        ctx.drawImage(img, 0, 0, width, height);
        const generatedData = ctx.getImageData(0, 0, width, height);

        // Get the current layer's pixels
        const storeState = useCanvasStore.getState();
        const currentFrame = storeState.frames[storeState.currentFrameIndex];
        if (storeState.currentLayerIndex < 0 || storeState.currentLayerIndex >= currentFrame.layers.length) return;

        const currentLayer = currentFrame.layers[storeState.currentLayerIndex];
        const originalPixels = currentLayer.pixels;
        const newPixels = new Uint8ClampedArray(originalPixels);
        const currentMask = storeState.maskData;

        // Composite: only replace pixels where mask is active
        if (currentMask) {
          for (let i = 0; i < currentMask.length; i++) {
            if (currentMask[i] > 0) { // Masked pixel - use generated
              const idx = i * 4;
              newPixels[idx] = generatedData.data[idx];
              newPixels[idx + 1] = generatedData.data[idx + 1];
              newPixels[idx + 2] = generatedData.data[idx + 2];
              newPixels[idx + 3] = generatedData.data[idx + 3];
            }
            // Non-masked pixels keep original values
          }
        }

        // Update the current layer with composited result
        const updatedLayers = [...currentFrame.layers];
        updatedLayers[storeState.currentLayerIndex] = {
          ...updatedLayers[storeState.currentLayerIndex],
          pixels: newPixels,
        };

        const updatedFrames = [...storeState.frames];
        updatedFrames[storeState.currentFrameIndex] = {
          ...currentFrame,
          layers: updatedLayers,
        };

        storeState.setFrames(updatedFrames);
        storeState.pushHistory();

        // Clear the mask after successful inpaint
        clearMask();
      };
      img.src = result.imageUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inpainting failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasMask = maskData && maskData.some(v => v > 0);

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <Wand2 className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-sm">AI Inpaint</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={() => setShowMask(!showMask)}
          title={showMask ? 'Hide mask' : 'Show mask'}
        >
          {showMask ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {/* Mask tools */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Mask Tools {tool === 'mask' && <span className="text-green-400">(Active)</span>}
          </label>
          <div className="flex gap-1">
            <Button
              variant={tool === 'mask' && maskTool === 'brush' ? 'default' : 'outline'}
              size="sm"
              className="h-8 flex-1"
              onClick={() => handleMaskToolSelect('brush')}
            >
              <Paintbrush className="w-3 h-3 mr-1" /> Brush
            </Button>
            <Button
              variant={tool === 'mask' && maskTool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              className="h-8 flex-1"
              onClick={() => handleMaskToolSelect('eraser')}
            >
              <Eraser className="w-3 h-3 mr-1" /> Erase
            </Button>
          </div>
        </div>

        {/* Brush size */}
        <div>
          <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>Brush Size</span>
            <span>{maskBrushSize}px</span>
          </label>
          <Slider
            value={[maskBrushSize]}
            onValueChange={([v]) => setMaskBrushSize(v)}
            min={1}
            max={32}
            step={1}
          />
        </div>

        {/* Clear mask */}
        {hasMask && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs text-red-400"
            onClick={clearMask}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear Mask
          </Button>
        )}

        {/* Prompt */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            What to generate in masked area
          </label>
          <Textarea
            placeholder="e.g., blue sword, golden crown, red cape..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Model Selection */}
        <div>
          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Inpaint Model</span>
          </label>
          <Select value={model} onValueChange={(v) => setModel(v as InpaintModel)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    <span className="text-[10px] text-gray-500">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Guidance (for Flux Fill) */}
        {model === 'flux-fill' && (
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Guidance
              </span>
              <span>{guidance}</span>
            </label>
            <Slider
              value={[guidance]}
              onValueChange={([v]) => setGuidance(v)}
              min={1}
              max={50}
              step={1}
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher = follows prompt more strictly
            </p>
          </div>
        )}

        {/* Strength (for Retro Diffusion) */}
        {model === 'retro-diffusion' && (
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
              <span>Strength</span>
              <span>{Math.round(strength * 100)}%</span>
            </label>
            <Slider
              value={[strength]}
              onValueChange={([v]) => setStrength(v)}
              min={0.1}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher = more change to masked area
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
            {error}
          </p>
        )}

        {/* Generate button */}
        <Button
          className="w-full"
          onClick={handleInpaint}
          disabled={isGenerating || !prompt.trim() || !hasMask}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Inpainting...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Inpaint (2 credits)
            </>
          )}
        </Button>

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to use AI inpainting
          </p>
        )}

        {!hasMask && (
          <p className="text-xs text-gray-500 text-center">
            Paint a mask on the canvas to select the area to regenerate
          </p>
        )}
      </div>
    </div>
  );
}
