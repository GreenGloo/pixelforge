'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RotateCw,
  Loader2,
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

// Direction labels for different column counts
const DIRECTION_LABELS: Record<number, string[]> = {
  4: ['front', 'right', 'back', 'left'],
  8: ['front', 'front-right', 'right', 'back-right', 'back', 'back-left', 'left', 'front-left'],
};

// Split a sprite sheet into individual frames using canvas
async function splitSpriteSheet(spriteSheet: SpriteSheetResponse): Promise<Rotation[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const rotations: Rotation[] = [];

      // Auto-detect columns if not specified (columns === -1)
      // Assume square sprites, so columns = width / height
      let columns = spriteSheet.columns;
      if (columns <= 0) {
        columns = Math.round(img.width / img.height);
        // Clamp to reasonable values (4 or 8)
        if (columns < 4) columns = 4;
        if (columns > 8) columns = 8;
        // Round to nearest of 4 or 8
        columns = columns <= 6 ? 4 : 8;
      }

      const directions = DIRECTION_LABELS[columns] || DIRECTION_LABELS[4];
      const spriteWidth = img.width / columns;
      const spriteHeight = img.height;

      console.log(`Splitting sprite sheet: ${img.width}x${img.height}, detected ${columns} columns`);

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

  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [spriteSheetUrl, setSpriteSheetUrl] = useState<string | null>(null);

  // 1 credit for sprite sheet generation (single API call)
  const creditCost = 1;

  const handleGenerate = async () => {
    if (!session?.user) {
      setError('Please sign in to generate');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a character description');
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

  const handleDownloadSpritesheet = async () => {
    if (!spriteSheetUrl && rotations.length === 0) return;

    // If we have the original sprite sheet URL, fetch and download as blob
    if (spriteSheetUrl) {
      try {
        const response = await fetch(spriteSheetUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `sprite-rotations-${rotations.length}dir.png`;
        link.href = blobUrl;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: use canvas method if fetch fails (CORS)
        downloadFromRotations();
      }
      return;
    }

    downloadFromRotations();
  };

  const downloadFromRotations = () => {
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
            link.download = `sprite-rotations-${rotations.length}dir.png`;
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
        {/* Info */}
        <div className="text-xs text-gray-500 bg-[#0f0f1a] p-2 rounded">
          Generates consistent 4-way character rotations: Front, Right, Back, Left
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Character Description <span className="text-red-400">*</span>
          </label>
          <Input
            placeholder="e.g., armored knight with sword, blue wizard with staff..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Be detailed for best results
          </p>
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
          disabled={isGenerating || !description.trim()}
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
            <div className={`grid gap-1 ${rotations.length <= 4 ? 'grid-cols-4' : 'grid-cols-4'}`}>
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
                      {rotation.direction.slice(0, 3)}
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
