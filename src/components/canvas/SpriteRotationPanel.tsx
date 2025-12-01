'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RotateCw,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Grid,
} from 'lucide-react';

interface Rotation {
  direction: string;
  imageUrl: string;
}

interface SpriteSheetResponse {
  url: string;
  spriteWidth: number;
  spriteHeight: number;
  columns: number;
  directions: string[];
}

// Split a sprite sheet into individual frames using canvas
async function splitSpriteSheet(spriteSheet: SpriteSheetResponse): Promise<Rotation[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const rotations: Rotation[] = [];
      const { columns, directions } = spriteSheet;

      // Calculate actual sprite dimensions from the loaded image
      const spriteWidth = img.width / columns;
      const spriteHeight = img.height;

      for (let i = 0; i < columns; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = spriteWidth;
        canvas.height = spriteHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw the portion of the sprite sheet for this frame
        ctx.drawImage(
          img,
          i * spriteWidth, 0,  // Source x, y
          spriteWidth, spriteHeight,  // Source width, height
          0, 0,  // Dest x, y
          spriteWidth, spriteHeight   // Dest width, height
        );

        rotations.push({
          direction: directions[i] || `rotation_${i}`,
          imageUrl: canvas.toDataURL('image/png'),
        });
      }

      resolve(rotations);
    };

    img.onerror = () => {
      reject(new Error('Failed to load sprite sheet image'));
    };

    img.src = spriteSheet.url;
  });
}

export function SpriteRotationPanel() {
  const { data: session } = useSession();
  const { loadFromUrl } = useCanvasStore();

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [spriteSheetUrl, setSpriteSheetUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1 credit for sprite sheet generation (single API call)
  const creditCost = 1;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
      setRotations([]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUseCanvas = useCallback(() => {
    // Get current canvas as image
    const store = useCanvasStore.getState();
    const frame = store.frames[store.currentFrameIndex];
    if (!frame) return;

    const canvas = document.createElement('canvas');
    canvas.width = store.width;
    canvas.height = store.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Composite all layers
    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      const imageData = ctx.createImageData(store.width, store.height);
      imageData.data.set(layer.pixels);
      ctx.putImageData(imageData, 0, 0);
    }

    setSourceImage(canvas.toDataURL('image/png'));
    setRotations([]);
  }, []);

  const handleRemoveSource = useCallback(() => {
    setSourceImage(null);
    setRotations([]);
    setSpriteSheetUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleGenerate = async () => {
    if (!session?.user) {
      setError('Please sign in to generate');
      return;
    }

    if (!sourceImage) {
      setError('Please upload or use canvas as source image');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setRotations([]);
    setSpriteSheetUrl(null);

    try {
      const response = await fetch('/api/sprite-rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImageUrl: sourceImage,
          characterDescription: description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      // Store the sprite sheet URL for download
      setSpriteSheetUrl(result.spriteSheet.url);

      // Split the sprite sheet into individual rotations
      const splitRotations = await splitSpriteSheet(result.spriteSheet);
      setRotations(splitRotations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToCanvas = async (imageUrl: string) => {
    await loadFromUrl(imageUrl);
  };

  const handleDownloadSpritesheet = () => {
    if (!spriteSheetUrl && rotations.length === 0) return;

    // If we have the original sprite sheet URL, download it directly
    if (spriteSheetUrl) {
      const link = document.createElement('a');
      link.download = `sprite-rotations-4dir.png`;
      link.href = spriteSheetUrl;
      link.click();
      return;
    }

    // Fallback: Create spritesheet from individual rotations
    if (rotations.length === 0) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const spriteSize = img.width;
      const cols = rotations.length;
      const canvas = document.createElement('canvas');
      canvas.width = spriteSize * cols;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load all images and draw them
      let loaded = 0;
      rotations.forEach((rotation, i) => {
        const rotImg = new Image();
        rotImg.crossOrigin = 'anonymous';
        rotImg.onload = () => {
          ctx.drawImage(rotImg, i * spriteSize, 0, spriteSize, img.height);
          loaded++;
          if (loaded === rotations.length) {
            const link = document.createElement('a');
            link.download = `sprite-rotations-4dir.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        };
        rotImg.src = rotation.imageUrl;
      });
    };
    img.src = rotations[0].imageUrl;
  };

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <RotateCw className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-sm">Sprite Rotations</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Source Image */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Source Sprite (front-facing)
          </label>
          {sourceImage ? (
            <div className="relative">
              <img
                src={sourceImage}
                alt="Source"
                className="w-full h-20 object-contain bg-[#0f0f1a] rounded"
                style={{ imageRendering: 'pixelated' }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 bg-black/50"
                onClick={handleRemoveSource}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-16 border-2 border-dashed border-[#2a2a4e] rounded hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Upload</span>
              </button>
              <button
                onClick={handleUseCanvas}
                className="flex-1 h-16 border-2 border-dashed border-[#2a2a4e] rounded hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Use Canvas</span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Directions info */}
        <div className="text-xs text-gray-500 bg-[#0f0f1a] p-2 rounded">
          Generates 4-way rotations: Front, Right, Back, Left
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Character Description (optional)
          </label>
          <Input
            placeholder="e.g., knight, wizard, robot..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
            {error}
          </p>
        )}

        {/* Generate button */}
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={isGenerating || !sourceImage}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating 4 views...
            </>
          ) : (
            <>
              <RotateCw className="w-4 h-4 mr-2" />
              Generate ({creditCost} credits)
            </>
          )}
        </Button>

        {/* Results */}
        {rotations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">
                Generated Rotations ({rotations.length})
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={handleDownloadSpritesheet}
              >
                <Grid className="w-3 h-3 mr-1" /> Spritesheet
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {rotations.map((rotation) => (
                <button
                  key={rotation.direction}
                  onClick={() => handleApplyToCanvas(rotation.imageUrl)}
                  className="relative group"
                  title={`Apply ${rotation.direction} to canvas`}
                >
                  <img
                    src={rotation.imageUrl}
                    alt={rotation.direction}
                    className="w-full aspect-square object-contain bg-[#0f0f1a] rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/30 transition-colors rounded flex items-center justify-center">
                    <span className="text-[8px] text-white/0 group-hover:text-white/90 uppercase font-bold">
                      {rotation.direction.slice(0, 2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to generate sprite rotations
          </p>
        )}
      </div>
    </div>
  );
}
