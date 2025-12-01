'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mountain,
  Loader2,
  Sparkles,
  Download,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

const THEMES = [
  { value: 'forest', label: 'Forest', color: '#22c55e' },
  { value: 'dungeon', label: 'Dungeon', color: '#6b7280' },
  { value: 'castle', label: 'Castle', color: '#a855f7' },
  { value: 'city', label: 'City', color: '#3b82f6' },
  { value: 'desert', label: 'Desert', color: '#f59e0b' },
  { value: 'snow', label: 'Snow', color: '#e0f2fe' },
  { value: 'underwater', label: 'Underwater', color: '#06b6d4' },
  { value: 'space', label: 'Space', color: '#1e1b4b' },
  { value: 'cave', label: 'Cave', color: '#78716c' },
  { value: 'village', label: 'Village', color: '#84cc16' },
  { value: 'battlefield', label: 'Battlefield', color: '#dc2626' },
  { value: 'sky', label: 'Sky/Floating', color: '#7dd3fc' },
];

const LAYERS = [
  { value: 'sky', label: 'Sky (Farthest)', desc: 'Clouds, sun/moon' },
  { value: 'far', label: 'Far Background', desc: 'Distant mountains' },
  { value: 'midground', label: 'Midground', desc: 'Trees, structures' },
  { value: 'foreground', label: 'Foreground', desc: 'Near details' },
  { value: 'ground', label: 'Ground (Nearest)', desc: 'Walking surface' },
];

const SIZES = [
  { value: '256x128', width: 256, height: 128, label: '256x128 (2:1)' },
  { value: '320x180', width: 320, height: 180, label: '320x180 (16:9)' },
  { value: '384x216', width: 384, height: 216, label: '384x216 (16:9)' },
  { value: '256x256', width: 256, height: 256, label: '256x256 (1:1)' },
];

interface GeneratedLayer {
  name: string;
  url: string;
}

export function BackgroundPanel() {
  const { data: session } = useSession();
  const { loadFromUrl } = useCanvasStore();

  const [theme, setTheme] = useState('forest');
  const [customPrompt, setCustomPrompt] = useState('');
  const [size, setSize] = useState('256x128');
  const [parallaxMode, setParallaxMode] = useState(false);
  const [selectedLayers, setSelectedLayers] = useState<string[]>(['sky', 'far', 'midground', 'foreground', 'ground']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLayers, setGeneratedLayers] = useState<GeneratedLayer[]>([]);

  const selectedSize = SIZES.find(s => s.value === size) || SIZES[0];

  const toggleLayer = (layer: string) => {
    setSelectedLayers(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

  const handleGenerate = async () => {
    if (!session?.user) {
      setError('Please sign in to generate');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedLayers([]);

    try {
      const response = await fetch('/api/generate/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          theme,
          width: selectedSize.width,
          height: selectedSize.height,
          ...(parallaxMode
            ? { layers: selectedLayers }
            : { layer: 'midground' }
          ),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      if (parallaxMode && result.generation?.layers) {
        // Parallax mode - multiple layers
        const layers: GeneratedLayer[] = [];
        for (const [name, url] of Object.entries(result.generation.layers)) {
          if (url) {
            layers.push({ name, url: url as string });
          }
        }
        setGeneratedLayers(layers);
      } else if (result.generation?.imageUrl) {
        // Single layer mode
        setGeneratedLayers([{ name: 'background', url: result.generation.imageUrl }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToCanvas = async (url: string) => {
    await loadFromUrl(url);
  };

  const handleDownloadAll = async () => {
    for (const layer of generatedLayers) {
      try {
        const response = await fetch(layer.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${theme}-${layer.name}.png`;
        link.click();

        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error(`Failed to download ${layer.name}:`, err);
      }
    }
  };

  const creditCost = parallaxMode ? selectedLayers.length : 1;

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <Mountain className="w-4 h-4 text-green-400" />
        <span className="font-semibold text-sm">Background Generator</span>
        {session?.user && (
          <span className="ml-auto text-xs text-gray-400">
            {session.user.credits} credits
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Theme selector */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Theme</label>
          <div className="grid grid-cols-4 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`p-1 rounded text-[10px] text-center transition-all ${
                  theme === t.value
                    ? 'ring-2 ring-green-500 bg-[#2a2a4e]'
                    : 'bg-[#0f0f1a] hover:bg-[#2a2a4e]'
                }`}
                title={t.label}
              >
                <div
                  className="w-full h-3 rounded mb-0.5"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-gray-400 truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Custom Details (optional)
          </label>
          <Input
            placeholder="e.g., autumn trees, ancient ruins..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Size */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Size</label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parallax mode toggle */}
        <div className="flex items-center justify-between p-2 bg-[#0f0f1a] rounded">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-xs font-medium">Parallax Mode</div>
              <div className="text-[10px] text-gray-500">Generate multiple layers</div>
            </div>
          </div>
          <Switch
            checked={parallaxMode}
            onCheckedChange={setParallaxMode}
          />
        </div>

        {/* Layer selection (parallax mode) */}
        {parallaxMode && (
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Select Layers</label>
            <div className="space-y-1">
              {LAYERS.map((layer) => (
                <button
                  key={layer.value}
                  onClick={() => toggleLayer(layer.value)}
                  className={`w-full p-2 rounded text-left text-xs transition-all ${
                    selectedLayers.includes(layer.value)
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-[#0f0f1a] border border-transparent hover:border-[#2a2a4e]'
                  }`}
                >
                  <div className="font-medium">{layer.label}</div>
                  <div className="text-[10px] text-gray-500">{layer.desc}</div>
                </button>
              ))}
            </div>
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
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleGenerate}
          disabled={isGenerating || (parallaxMode && selectedLayers.length === 0)}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating {parallaxMode ? `${selectedLayers.length} layers` : 'background'}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate ({creditCost} credit{creditCost > 1 ? 's' : ''})
            </>
          )}
        </Button>

        {/* Results */}
        {generatedLayers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">
                Generated ({generatedLayers.length} layer{generatedLayers.length > 1 ? 's' : ''})
              </label>
              {generatedLayers.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleDownloadAll}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download All
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {generatedLayers.map((layer) => (
                <div
                  key={layer.name}
                  className="bg-[#0f0f1a] rounded p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">{layer.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleApplyToCanvas(layer.url)}
                      >
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  <img
                    src={layer.url}
                    alt={layer.name}
                    className="w-full h-16 object-cover rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to generate backgrounds
          </p>
        )}
      </div>
    </div>
  );
}
