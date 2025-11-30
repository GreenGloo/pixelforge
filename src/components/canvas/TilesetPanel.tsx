'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Grid3X3,
  Loader2,
  Download,
  Eye,
  Sparkles,
} from 'lucide-react';

interface Tile {
  id: string;
  name: string;
  imageUrl: string;
}

const THEMES = [
  { id: 'grass', name: 'Grass', color: '#4ade80' },
  { id: 'water', name: 'Water', color: '#60a5fa' },
  { id: 'stone', name: 'Stone', color: '#9ca3af' },
  { id: 'dirt', name: 'Dirt', color: '#a16207' },
  { id: 'sand', name: 'Sand', color: '#fde047' },
  { id: 'snow', name: 'Snow', color: '#f0f9ff' },
  { id: 'lava', name: 'Lava', color: '#f97316' },
  { id: 'wood', name: 'Wood', color: '#92400e' },
  { id: 'brick', name: 'Brick', color: '#dc2626' },
  { id: 'metal', name: 'Metal', color: '#64748b' },
];

const TILE_SIZES = [16, 32, 64];

export function TilesetPanel() {
  const { data: session } = useSession();
  const { loadFromUrl } = useCanvasStore();

  const [theme, setTheme] = useState('grass');
  const [customPrompt, setCustomPrompt] = useState('');
  const [tileSize, setTileSize] = useState(32);
  const [tilesetType, setTilesetType] = useState<'basic' | 'full'>('basic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleGenerate = async () => {
    if (!session?.user) {
      setError('Please sign in to generate');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setTiles([]);

    try {
      const response = await fetch('/api/tileset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          customPrompt,
          tileSize,
          tilesetType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      setTiles(result.tiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToCanvas = async (imageUrl: string) => {
    await loadFromUrl(imageUrl);
  };

  // Render tilemap preview
  useEffect(() => {
    if (!showPreview || tiles.length === 0 || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 5; // 5x5 grid
    const displayTileSize = 24;
    canvas.width = previewSize * displayTileSize;
    canvas.height = previewSize * displayTileSize;

    // Simple tilemap layout
    const tileMap = [
      ['top-left', 'top', 'top', 'top', 'top-right'],
      ['left', 'center', 'center', 'center', 'right'],
      ['left', 'center', 'center', 'center', 'right'],
      ['left', 'center', 'center', 'center', 'right'],
      ['bottom-left', 'bottom', 'bottom', 'bottom', 'bottom-right'],
    ];

    // Create a map of tile IDs to images
    const tileImages: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;

    tiles.forEach((tile) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        tileImages[tile.id] = img;
        loadedCount++;

        if (loadedCount === tiles.length) {
          // All loaded, render
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;

          for (let y = 0; y < previewSize; y++) {
            for (let x = 0; x < previewSize; x++) {
              const tileId = tileMap[y][x];
              const img = tileImages[tileId] || tileImages['center'];
              if (img) {
                ctx.drawImage(
                  img,
                  x * displayTileSize,
                  y * displayTileSize,
                  displayTileSize,
                  displayTileSize
                );
              }
            }
          }
        }
      };
      img.src = tile.imageUrl;
    });
  }, [showPreview, tiles]);

  const handleDownloadSpritesheet = () => {
    if (tiles.length === 0) return;

    // Create spritesheet - arrange tiles in a 3x3 or 4x5 grid
    const cols = tilesetType === 'basic' ? 3 : 4;
    const rows = Math.ceil(tiles.length / cols);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const spriteSize = img.width;
      const canvas = document.createElement('canvas');
      canvas.width = spriteSize * cols;
      canvas.height = spriteSize * rows;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let loaded = 0;
      tiles.forEach((tile, i) => {
        const tileImg = new Image();
        tileImg.crossOrigin = 'anonymous';
        tileImg.onload = () => {
          const x = (i % cols) * spriteSize;
          const y = Math.floor(i / cols) * spriteSize;
          ctx.drawImage(tileImg, x, y, spriteSize, spriteSize);
          loaded++;

          if (loaded === tiles.length) {
            const link = document.createElement('a');
            link.download = `tileset-${theme}-${tileSize}px.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        };
        tileImg.src = tile.imageUrl;
      });
    };
    img.src = tiles[0].imageUrl;
  };

  const handleDownloadMetadata = () => {
    if (tiles.length === 0) return;

    const metadata = {
      name: `${theme}-tileset`,
      tileSize,
      type: tilesetType,
      tiles: tiles.map((tile, index) => ({
        id: tile.id,
        name: tile.name,
        x: (index % (tilesetType === 'basic' ? 3 : 4)) * tileSize,
        y: Math.floor(index / (tilesetType === 'basic' ? 3 : 4)) * tileSize,
        width: tileSize,
        height: tileSize,
      })),
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `tileset-${theme}-${tileSize}px.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const creditCost = tilesetType === 'basic' ? 9 : 17;

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <Grid3X3 className="w-4 h-4 text-green-400" />
        <span className="font-semibold text-sm">Tileset Generator</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Theme selector */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Theme</label>
          <div className="grid grid-cols-5 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-1 rounded text-[10px] text-center transition-all ${
                  theme === t.id
                    ? 'ring-2 ring-purple-500 bg-[#2a2a4e]'
                    : 'bg-[#0f0f1a] hover:bg-[#2a2a4e]'
                }`}
                title={t.name}
              >
                <div
                  className="w-full h-4 rounded mb-1"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-gray-400">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Custom Style (optional)
          </label>
          <Input
            placeholder="e.g., forest, medieval, sci-fi..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Tile size */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tile Size</label>
          <div className="flex gap-2">
            {TILE_SIZES.map((size) => (
              <Button
                key={size}
                variant={tileSize === size ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setTileSize(size)}
              >
                {size}x{size}
              </Button>
            ))}
          </div>
        </div>

        {/* Tileset type */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tileset Type</label>
          <div className="flex gap-2">
            <Button
              variant={tilesetType === 'basic' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setTilesetType('basic')}
            >
              <div className="text-left">
                <div className="text-xs">Basic (9 tiles)</div>
                <div className="text-[10px] text-gray-400">Edges + Corners</div>
              </div>
            </Button>
            <Button
              variant={tilesetType === 'full' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setTilesetType('full')}
            >
              <div className="text-left">
                <div className="text-xs">Full (17 tiles)</div>
                <div className="text-[10px] text-gray-400">+ Inner corners</div>
              </div>
            </Button>
          </div>
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
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating {tilesetType === 'basic' ? 9 : 17} tiles...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate ({creditCost} credits)
            </>
          )}
        </Button>

        {/* Results */}
        {tiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">
                Generated Tiles ({tiles.length})
              </label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={handleDownloadSpritesheet}
                >
                  <Download className="w-3 h-3 mr-1" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={handleDownloadMetadata}
                >
                  JSON
                </Button>
              </div>
            </div>

            {/* Tilemap preview */}
            {showPreview && (
              <div className="bg-[#0f0f1a] p-2 rounded flex items-center justify-center">
                <canvas
                  ref={previewCanvasRef}
                  style={{ imageRendering: 'pixelated' }}
                  className="border border-[#2a2a4e]"
                />
              </div>
            )}

            {/* Tile grid */}
            <div className="grid grid-cols-3 gap-1">
              {tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => handleApplyToCanvas(tile.imageUrl)}
                  className="relative group"
                  title={`Apply ${tile.name} to canvas`}
                >
                  <img
                    src={tile.imageUrl}
                    alt={tile.name}
                    className="w-full aspect-square object-contain bg-[#0f0f1a] rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/30 transition-colors rounded flex items-center justify-center">
                    <span className="text-[8px] text-white/0 group-hover:text-white/90 uppercase font-bold text-center px-1">
                      {tile.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to generate tilesets
          </p>
        )}
      </div>
    </div>
  );
}
