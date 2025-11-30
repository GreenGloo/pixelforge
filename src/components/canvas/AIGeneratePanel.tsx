'use client';

import { useState } from 'react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, ArrowRight, Palette, User, Package, Mountain, Grid3X3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { loadImageData, convertToPixelArt, imageDataToDataUrl } from '@/lib/pixelart-processor';
import { DEFAULT_PALETTES } from '@/lib/canvas/types';

const STYLE_OPTIONS = [
  { value: 'CHARACTER', label: 'Character Sprite' },
  { value: 'ITEM', label: 'Item/Icon' },
  { value: 'SCENE', label: 'Scene/Background' },
  { value: 'TILE', label: 'Tileable Texture' },
  { value: 'ANIMATION', label: 'Animation Frame' },
];

// Item categories for better prompt building
const ITEM_CATEGORY_OPTIONS = [
  { value: 'weapon', label: 'Weapon (Sword, Axe, etc.)' },
  { value: 'armor', label: 'Armor (Shield, Helm, etc.)' },
  { value: 'potion', label: 'Potion/Consumable' },
  { value: 'food', label: 'Food Item' },
  { value: 'material', label: 'Crafting Material' },
  { value: 'tool', label: 'Tool (Pickaxe, Key, etc.)' },
  { value: 'accessory', label: 'Accessory (Ring, Amulet)' },
  { value: 'treasure', label: 'Treasure (Gem, Coin)' },
  { value: 'icon', label: 'UI Icon' },
  { value: 'custom', label: 'Custom/Other' },
];

const ITEM_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (16-32px ideal)' },
  { value: 'medium', label: 'Medium (32-64px ideal)' },
  { value: 'large', label: 'Large (64-128px ideal)' },
];

// Pixel art eras for items
const PIXEL_STYLE_OPTIONS = [
  { value: '8-bit', label: '8-bit (NES era)' },
  { value: '16-bit', label: '16-bit (SNES era)' },
  { value: '32-bit', label: '32-bit (PS1 era)' },
  { value: 'hd-pixel', label: 'HD Pixel (Modern)' },
];

// Scene themes for better background generation
const SCENE_THEME_OPTIONS = [
  { value: 'forest', label: 'Forest/Woodland' },
  { value: 'dungeon', label: 'Dungeon/Underground' },
  { value: 'castle', label: 'Castle/Medieval' },
  { value: 'city', label: 'City/Urban' },
  { value: 'desert', label: 'Desert/Arid' },
  { value: 'snow', label: 'Snow/Winter' },
  { value: 'underwater', label: 'Underwater/Ocean' },
  { value: 'space', label: 'Space/Cosmic' },
  { value: 'cave', label: 'Cave/Cavern' },
  { value: 'village', label: 'Village/Rural' },
  { value: 'battlefield', label: 'Battlefield/Ruins' },
  { value: 'sky', label: 'Sky/Floating' },
  { value: 'custom', label: 'Custom Theme' },
];

const SIZE_OPTIONS = [
  { value: '16', label: '16x16' },
  { value: '32', label: '32x32' },
  { value: '48', label: '48x48' },
  { value: '64', label: '64x64' },
  { value: '96', label: '96x96' },
  { value: '128', label: '128x128' },
];

const POSE_OPTIONS = [
  { value: 'none', label: 'No Pose (Manual)' },
  { value: 'idle_front', label: 'Idle Front' },
  { value: 'idle_side', label: 'Idle Side' },
  { value: 'walk_cycle', label: 'Walk Cycle' },
  { value: 'run_cycle', label: 'Run Cycle' },
  { value: 'attack_melee', label: 'Melee Attack' },
  { value: 'attack_ranged', label: 'Ranged Attack' },
  { value: 'jump', label: 'Jump' },
  { value: 'crouch', label: 'Crouch' },
  { value: 'death', label: 'Death' },
  { value: 'hurt', label: 'Hurt' },
];

const PALETTE_OPTIONS = [
  { value: 'default', label: 'Default (Full Color)' },
  { value: 'gameboy', label: 'Game Boy (4 Colors)' },
  { value: 'nes', label: 'NES' },
  { value: 'snes', label: 'SNES' },
  { value: 'pico8', label: 'PICO-8 (16 Colors)' },
  { value: 'endesga32', label: 'ENDESGA-32' },
  { value: 'fantasy', label: 'Fantasy Warm' },
  { value: 'cyberpunk', label: 'Cyberpunk Neon' },
  { value: 'nature', label: 'Nature Greens' },
  { value: 'monochrome', label: 'Monochrome' },
];

export function AIGeneratePanel() {
  const { data: session } = useSession();
  const { loadFromUrl, reset, width, height } = useCanvasStore();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('CHARACTER');
  const [size, setSize] = useState('64');
  const [pose, setPose] = useState('none');
  const [palette, setPalette] = useState('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneration, setLastGeneration] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Item-specific options
  const [itemCategory, setItemCategory] = useState('custom');
  const [itemSize, setItemSize] = useState('medium');
  const [itemPalette, setItemPalette] = useState('default');
  const [itemPixelStyle, setItemPixelStyle] = useState('16-bit');
  const [sheetMode, setSheetMode] = useState(false);
  // Scene-specific options
  const [sceneTheme, setSceneTheme] = useState('custom');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!session) {
      toast.error('Please sign in to generate images');
      return;
    }

    setIsGenerating(true);

    try {
      const sizeNum = parseInt(size);

      // Use the sprite endpoint for CHARACTER style with Retro Diffusion
      if (style === 'CHARACTER') {
        const response = await fetch('/api/generate/sprite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            size: sizeNum,
            pose: pose !== 'none' ? pose : undefined,
            palette,
            removeBackground: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        setLastGeneration(data.generation.imageUrl);
        toast.success('Sprite generated! Click "Load to Canvas" to edit it.');
      } else if (style === 'ITEM') {
        // Use main generate endpoint with ITEM style and prompt builder
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            style: 'ITEM',
            pixelSize: sizeNum,
            itemCategory,
            itemSize,
            palette: itemPalette,
            pixelStyle: itemPixelStyle,
            sheetMode,
            removeBackground: true, // Items always have transparent backgrounds
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        setLastGeneration(data.generation.imageUrl);
        const modeText = sheetMode ? 'Item sheet' : 'Item';
        toast.success(`${modeText} generated! Click "Load to Canvas" to edit it.`);
      } else {
        // Use original endpoint for SCENE, TILE, ANIMATION
        const requestBody: Record<string, unknown> = {
          prompt,
          style,
          pixelSize: sizeNum,
        };

        // Add scene-specific options
        if (style === 'SCENE') {
          requestBody.sceneTheme = sceneTheme;
        }

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        setLastGeneration(data.generation.imageUrl);
        toast.success('Image generated! Click "Load to Canvas" to edit it.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadToCanvas = async () => {
    if (!lastGeneration) return;

    try {
      const sizeNum = parseInt(size);

      // Load the high-res image
      const imageData = await loadImageData(lastGeneration);

      // Convert to true pixel art - downscale and quantize colors
      const pixelArt = convertToPixelArt(imageData, {
        targetWidth: sizeNum,
        targetHeight: sizeNum,
        palette: DEFAULT_PALETTES[3], // ENDESGA 32 palette for nice colors
        removeAA: true,
        aaThreshold: 128,
      });

      // Convert to data URL and load to canvas
      const pixelArtUrl = imageDataToDataUrl(pixelArt);

      reset(sizeNum, sizeNum);
      await loadFromUrl(pixelArtUrl);
      toast.success(`Converted to ${sizeNum}x${sizeNum} pixel art!`);
    } catch (error) {
      console.error('Load to canvas error:', error);
      toast.error('Failed to load image to canvas');
    }
  };

  // Show style-specific options
  const showCharacterOptions = style === 'CHARACTER';
  const showItemOptions = style === 'ITEM';
  const showSceneOptions = style === 'SCENE';

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e] p-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="font-semibold text-sm">AI Generate</h3>
        {session?.user?.credits !== undefined && (
          <span className="ml-auto text-xs text-gray-400">
            {session.user.credits} credits
          </span>
        )}
      </div>

      <Textarea
        placeholder="Describe your pixel art... (e.g., 'a brave knight with a sword')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-3 h-20 text-sm resize-none"
      />

      <div className="flex gap-2 mb-3">
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Character-specific options: Pose & Palette */}
      {showCharacterOptions && (
        <div className="mb-3 space-y-2">
          <button
            type="button"
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '- Hide' : '+ Show'} Pose & Palette Options
          </button>

          {showAdvanced && (
            <div className="space-y-2 p-2 bg-[#0f0f1a] rounded border border-[#2a2a4e]">
              {/* Pose Preset */}
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 w-12">Pose</span>
                <Select value={pose} onValueChange={setPose}>
                  <SelectTrigger className="flex-1 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color Palette */}
              <div className="flex items-center gap-2">
                <Palette className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 w-12">Palette</span>
                <Select value={palette} onValueChange={setPalette}>
                  <SelectTrigger className="flex-1 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PALETTE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-gray-500 italic">
                Pose presets ensure full character visibility. Palettes give consistent game art styles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Item-specific options: Category & Size */}
      {showItemOptions && (
        <div className="mb-3 space-y-2 p-2 bg-[#0f0f1a] rounded border border-[#2a2a4e]">
          <div className="flex items-center gap-1 mb-1">
            <Package className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Item Options</span>
          </div>

          {/* Item Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-16">Category</span>
            <Select value={itemCategory} onValueChange={setItemCategory}>
              <SelectTrigger className="flex-1 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Size Hint */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-16">Size</span>
            <Select value={itemSize} onValueChange={setItemSize}>
              <SelectTrigger className="flex-1 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Palette and Pixel Era in a row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Palette className="w-3 h-3 text-gray-400" />
              <Select value={itemPalette} onValueChange={setItemPalette}>
                <SelectTrigger className="flex-1 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PALETTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Select value={itemPixelStyle} onValueChange={setItemPixelStyle}>
                <SelectTrigger className="flex-1 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIXEL_STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sheet Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Grid3X3 className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Item Sheet (4 variations)</span>
            </div>
            <Switch
              checked={sheetMode}
              onCheckedChange={setSheetMode}
            />
          </div>

          <p className="text-xs text-gray-500 italic">
            Category helps optimize prompts. Items are generated clean without messy effects.
          </p>
        </div>
      )}

      {/* Scene-specific options: Theme */}
      {showSceneOptions && (
        <div className="mb-3 space-y-2 p-2 bg-[#0f0f1a] rounded border border-[#2a2a4e]">
          <div className="flex items-center gap-1 mb-1">
            <Mountain className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-green-400">Scene Options</span>
          </div>

          {/* Scene Theme */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12">Theme</span>
            <Select value={sceneTheme} onValueChange={setSceneTheme}>
              <SelectTrigger className="flex-1 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENE_THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-gray-500 italic">
            Scenes use flat 2D composition with no perspective. Perfect for side-scrolling games.
          </p>
        </div>
      )}

      <Button
        className="w-full h-9 bg-purple-600 hover:bg-purple-700"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate (1 credit)
          </>
        )}
      </Button>

      {/* Preview and load */}
      {lastGeneration && (
        <div className="mt-3 p-2 bg-[#0f0f1a] rounded">
          <div className="text-xs text-gray-400 mb-2">Last Generation:</div>
          <div className="flex gap-2">
            <div
              className="w-16 h-16 rounded border border-[#2a2a4e]"
              style={{
                backgroundImage: `url(${lastGeneration})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            />
            <div className="flex-1 flex flex-col justify-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={loadToCanvas}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Load to Canvas
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                This will replace canvas content
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
