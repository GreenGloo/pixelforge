'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Wand2, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const STYLES = [
  { value: 'CHARACTER', label: 'Character', description: 'Game sprites and characters' },
  { value: 'ITEM', label: 'Item', description: 'Icons and inventory items' },
  { value: 'SCENE', label: 'Scene', description: 'Backgrounds and environments' },
  { value: 'TILE', label: 'Tile', description: 'Seamless tileable textures' },
];

const SIZES = [
  { value: '32', label: '32x32', description: 'Small icons' },
  { value: '64', label: '64x64', description: 'Standard sprites' },
  { value: '128', label: '128x128', description: 'Detailed art' },
];

// User-friendly item categories
const ITEM_CATEGORIES = [
  { value: 'weapon', label: 'Weapon', description: 'Swords, axes, bows' },
  { value: 'armor', label: 'Armor', description: 'Helmets, shields, boots' },
  { value: 'potion', label: 'Potion', description: 'Health, mana, buffs' },
  { value: 'food', label: 'Food', description: 'Consumable foods' },
  { value: 'material', label: 'Material', description: 'Crafting materials' },
  { value: 'tool', label: 'Tool', description: 'Pickaxes, hammers' },
  { value: 'accessory', label: 'Accessory', description: 'Rings, necklaces' },
  { value: 'treasure', label: 'Treasure', description: 'Coins, gems' },
  { value: 'custom', label: 'Custom', description: 'Anything else' },
];

// Color palettes for items
const PALETTES = [
  { value: 'default', label: 'Default', description: 'Standard colors' },
  { value: 'gameboy', label: 'Game Boy', description: 'Green monochrome' },
  { value: 'nes', label: 'NES', description: 'Classic 8-bit' },
  { value: 'snes', label: 'SNES', description: '16-bit vibrant' },
  { value: 'pico8', label: 'PICO-8', description: '16 color indie' },
  { value: 'fantasy', label: 'Fantasy', description: 'Warm golden tones' },
  { value: 'cyberpunk', label: 'Cyberpunk', description: 'Neon pink/cyan' },
];

// Pixel art eras
const PIXEL_STYLES = [
  { value: '8-bit', label: '8-bit', description: 'NES era, chunky' },
  { value: '16-bit', label: '16-bit', description: 'SNES era, vibrant' },
  { value: '32-bit', label: '32-bit', description: 'PS1 era, detailed' },
  { value: 'hd-pixel', label: 'HD Pixel', description: 'Modern, high detail' },
];

interface GenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
}

interface GenerationFormProps {
  onGenerated?: (result: GenerationResult) => void;
}

export function GenerationForm({ onGenerated }: GenerationFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('CHARACTER');
  const [pixelSize, setPixelSize] = useState('64');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  // Item-specific options
  const [itemCategory, setItemCategory] = useState('custom');
  const [palette, setPalette] = useState('default');
  const [pixelStyle, setPixelStyle] = useState('16-bit');
  const [sheetMode, setSheetMode] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt: negativePrompt || undefined,
          style,
          pixelSize: parseInt(pixelSize),
          width: 512,
          height: 512,
          // Item-specific options (only sent for ITEM style)
          ...(style === 'ITEM' && {
            itemCategory,
            palette,
            pixelStyle,
            sheetMode,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data.generation);
      onGenerated?.(data.generation);

      toast({
        title: 'Success!',
        description: 'Your pixel art has been generated',
      });

      // Refresh to update credit count
      router.refresh();
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Pixel Art
          </CardTitle>
          <CardDescription>
            Describe what you want to create and let AI do the magic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="A brave knight holding a sword, medieval armor, heroic pose..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negative">Negative Prompt (optional)</Label>
            <Input
              id="negative"
              placeholder="Things to avoid in the generation..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          </div>

          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item-specific options - only shown when ITEM style is selected */}
          {style === 'ITEM' && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Grid3X3 className="h-4 w-4" />
                Item Options
              </div>

              {/* Item Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex flex-col">
                          <span>{c.label}</span>
                          <span className="text-xs text-muted-foreground">{c.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Palette and Pixel Style in a row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Palette</Label>
                  <Select value={palette} onValueChange={setPalette}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PALETTES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span>{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pixel Era</Label>
                  <Select value={pixelStyle} onValueChange={setPixelStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIXEL_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span>{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sheet Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Item Sheet</Label>
                  <p className="text-xs text-muted-foreground">Generate 4 variations</p>
                </div>
                <Switch
                  checked={sheetMode}
                  onCheckedChange={setSheetMode}
                />
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Output Size</Label>
            <Select value={pixelSize} onValueChange={setPixelSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate (1 credit)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Your generated pixel art will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Creating your pixel art...</span>
              </div>
            ) : result ? (
              <img
                src={result.imageUrl}
                alt={result.prompt}
                className="w-full h-full object-contain image-pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Sparkles className="h-8 w-8" />
                <span>Enter a prompt and click Generate</span>
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Download image
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = `pixelforge-${result.id}.png`;
                  link.click();
                }}
              >
                Download PNG
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPrompt(result.prompt);
                  setResult(null);
                }}
              >
                Edit & Regenerate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
