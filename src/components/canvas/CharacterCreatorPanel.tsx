'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Shirt,
  Crown,
  Sword,
  Shield,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shuffle,
  Download,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Character part categories
const BODY_TYPES = [
  { id: 'human_male', label: 'Human (M)', desc: 'standard male humanoid' },
  { id: 'human_female', label: 'Human (F)', desc: 'standard female humanoid' },
  { id: 'elf', label: 'Elf', desc: 'slender elven build' },
  { id: 'dwarf', label: 'Dwarf', desc: 'stocky dwarven build' },
  { id: 'orc', label: 'Orc', desc: 'muscular orcish build' },
  { id: 'skeleton', label: 'Skeleton', desc: 'skeletal undead' },
  { id: 'robot', label: 'Robot', desc: 'mechanical humanoid' },
  { id: 'slime', label: 'Slime', desc: 'gelatinous blob body' },
];

const HAIR_STYLES = [
  { id: 'none', label: 'None', desc: 'bald' },
  { id: 'short', label: 'Short', desc: 'short cropped hair' },
  { id: 'medium', label: 'Medium', desc: 'medium length hair' },
  { id: 'long', label: 'Long', desc: 'long flowing hair' },
  { id: 'spiky', label: 'Spiky', desc: 'spiky anime-style hair' },
  { id: 'ponytail', label: 'Ponytail', desc: 'hair tied in ponytail' },
  { id: 'mohawk', label: 'Mohawk', desc: 'punk mohawk style' },
  { id: 'braided', label: 'Braided', desc: 'braided hair' },
];

const HAIR_COLORS = [
  { id: 'black', label: 'Black', color: '#1a1a1a' },
  { id: 'brown', label: 'Brown', color: '#8B4513' },
  { id: 'blonde', label: 'Blonde', color: '#F4D03F' },
  { id: 'red', label: 'Red', color: '#C0392B' },
  { id: 'white', label: 'White', color: '#ECF0F1' },
  { id: 'blue', label: 'Blue', color: '#3498DB' },
  { id: 'purple', label: 'Purple', color: '#9B59B6' },
  { id: 'green', label: 'Green', color: '#27AE60' },
];

const OUTFIT_TYPES = [
  { id: 'none', label: 'None', desc: 'no clothing' },
  { id: 'casual', label: 'Casual', desc: 'simple tunic and pants' },
  { id: 'armor_light', label: 'Light Armor', desc: 'leather armor' },
  { id: 'armor_heavy', label: 'Heavy Armor', desc: 'plate armor' },
  { id: 'robe', label: 'Robe', desc: 'wizard robes' },
  { id: 'ninja', label: 'Ninja', desc: 'black ninja outfit' },
  { id: 'royal', label: 'Royal', desc: 'royal garments' },
  { id: 'tribal', label: 'Tribal', desc: 'tribal warrior outfit' },
];

const OUTFIT_COLORS = [
  { id: 'brown', label: 'Brown', color: '#8B4513' },
  { id: 'gray', label: 'Gray', color: '#7F8C8D' },
  { id: 'blue', label: 'Blue', color: '#2980B9' },
  { id: 'red', label: 'Red', color: '#C0392B' },
  { id: 'green', label: 'Green', color: '#27AE60' },
  { id: 'purple', label: 'Purple', color: '#8E44AD' },
  { id: 'black', label: 'Black', color: '#2C3E50' },
  { id: 'gold', label: 'Gold', color: '#F39C12' },
];

const WEAPON_TYPES = [
  { id: 'none', label: 'None', desc: 'unarmed' },
  { id: 'sword', label: 'Sword', desc: 'one-handed sword' },
  { id: 'greatsword', label: 'Greatsword', desc: 'two-handed greatsword' },
  { id: 'axe', label: 'Axe', desc: 'battle axe' },
  { id: 'bow', label: 'Bow', desc: 'wooden bow' },
  { id: 'staff', label: 'Staff', desc: 'magic staff' },
  { id: 'dagger', label: 'Dagger', desc: 'dual daggers' },
  { id: 'hammer', label: 'Hammer', desc: 'war hammer' },
];

const ACCESSORY_TYPES = [
  { id: 'none', label: 'None', desc: 'no accessories' },
  { id: 'shield', label: 'Shield', desc: 'round shield' },
  { id: 'cape', label: 'Cape', desc: 'flowing cape' },
  { id: 'helmet', label: 'Helmet', desc: 'protective helmet' },
  { id: 'crown', label: 'Crown', desc: 'royal crown' },
  { id: 'mask', label: 'Mask', desc: 'face mask' },
  { id: 'wings', label: 'Wings', desc: 'angelic wings' },
  { id: 'backpack', label: 'Backpack', desc: 'adventure backpack' },
];

const SKIN_COLORS = [
  { id: 'light', label: 'Light', color: '#FDEBD0' },
  { id: 'medium', label: 'Medium', color: '#D4A574' },
  { id: 'tan', label: 'Tan', color: '#C68642' },
  { id: 'dark', label: 'Dark', color: '#8D5524' },
  { id: 'pale', label: 'Pale', color: '#F5EEF8' },
  { id: 'green', label: 'Green', color: '#58D68D' },
  { id: 'blue', label: 'Blue', color: '#5DADE2' },
  { id: 'gray', label: 'Gray', color: '#ABB2B9' },
];

interface CharacterConfig {
  bodyType: string;
  skinColor: string;
  hairStyle: string;
  hairColor: string;
  outfitType: string;
  outfitColor: string;
  weaponType: string;
  accessoryType: string;
}

const DEFAULT_CONFIG: CharacterConfig = {
  bodyType: 'human_male',
  skinColor: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  outfitType: 'casual',
  outfitColor: 'brown',
  weaponType: 'none',
  accessoryType: 'none',
};

// One-click character presets
const CHARACTER_PRESETS = [
  {
    label: 'Knight',
    icon: '⚔️',
    config: { bodyType: 'human_male', skinColor: 'medium', hairStyle: 'short', hairColor: 'brown', outfitType: 'armor_heavy', outfitColor: 'gray', weaponType: 'sword', accessoryType: 'shield' },
  },
  {
    label: 'Mage',
    icon: '🧙',
    config: { bodyType: 'human_male', skinColor: 'pale', hairStyle: 'long', hairColor: 'white', outfitType: 'robe', outfitColor: 'purple', weaponType: 'staff', accessoryType: 'none' },
  },
  {
    label: 'Rogue',
    icon: '🗡️',
    config: { bodyType: 'human_female', skinColor: 'tan', hairStyle: 'ponytail', hairColor: 'black', outfitType: 'ninja', outfitColor: 'black', weaponType: 'dagger', accessoryType: 'mask' },
  },
  {
    label: 'Archer',
    icon: '🏹',
    config: { bodyType: 'elf', skinColor: 'light', hairStyle: 'braided', hairColor: 'blonde', outfitType: 'armor_light', outfitColor: 'green', weaponType: 'bow', accessoryType: 'cape' },
  },
  {
    label: 'Warrior',
    icon: '🪓',
    config: { bodyType: 'orc', skinColor: 'green', hairStyle: 'mohawk', hairColor: 'black', outfitType: 'tribal', outfitColor: 'brown', weaponType: 'axe', accessoryType: 'none' },
  },
  {
    label: 'Cleric',
    icon: '✨',
    config: { bodyType: 'dwarf', skinColor: 'medium', hairStyle: 'braided', hairColor: 'red', outfitType: 'robe', outfitColor: 'gold', weaponType: 'hammer', accessoryType: 'helmet' },
  },
  {
    label: 'Necro',
    icon: '💀',
    config: { bodyType: 'skeleton', skinColor: 'gray', hairStyle: 'none', hairColor: 'black', outfitType: 'robe', outfitColor: 'black', weaponType: 'staff', accessoryType: 'crown' },
  },
  {
    label: 'Mech',
    icon: '🤖',
    config: { bodyType: 'robot', skinColor: 'gray', hairStyle: 'none', hairColor: 'black', outfitType: 'armor_heavy', outfitColor: 'blue', weaponType: 'greatsword', accessoryType: 'backpack' },
  },
];

export function CharacterCreatorPanel() {
  const { data: session } = useSession();
  const { loadFromUrl } = useCanvasStore();

  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [customDetails, setCustomDetails] = useState('');
  const [generatingPreset, setGeneratingPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Section expansion states
  const [isBodyExpanded, setIsBodyExpanded] = useState(true);
  const [isHairExpanded, setIsHairExpanded] = useState(true);
  const [isOutfitExpanded, setIsOutfitExpanded] = useState(true);
  const [isEquipExpanded, setIsEquipExpanded] = useState(false);

  const updateConfig = (key: keyof CharacterConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Build the character description from config
  const buildCharacterPrompt = useCallback(() => {
    const body = BODY_TYPES.find(b => b.id === config.bodyType);
    const skin = SKIN_COLORS.find(s => s.id === config.skinColor);
    const hair = HAIR_STYLES.find(h => h.id === config.hairStyle);
    const hairColor = HAIR_COLORS.find(c => c.id === config.hairColor);
    const outfit = OUTFIT_TYPES.find(o => o.id === config.outfitType);
    const outfitColor = OUTFIT_COLORS.find(c => c.id === config.outfitColor);
    const weapon = WEAPON_TYPES.find(w => w.id === config.weaponType);
    const accessory = ACCESSORY_TYPES.find(a => a.id === config.accessoryType);

    const parts: string[] = ['pixel art character sprite'];

    // Body
    if (body) parts.push(body.desc);
    if (skin && !['skeleton', 'robot', 'slime'].includes(config.bodyType)) {
      parts.push(`${skin.label.toLowerCase()} skin`);
    }

    // Hair
    if (hair && config.hairStyle !== 'none') {
      parts.push(`${hairColor?.label.toLowerCase() || ''} ${hair.desc}`);
    }

    // Outfit
    if (outfit && config.outfitType !== 'none') {
      parts.push(`${outfitColor?.label.toLowerCase() || ''} ${outfit.desc}`);
    }

    // Weapon
    if (weapon && config.weaponType !== 'none') {
      parts.push(`holding ${weapon.desc}`);
    }

    // Accessory
    if (accessory && config.accessoryType !== 'none') {
      parts.push(`with ${accessory.desc}`);
    }

    // Custom details
    if (customDetails.trim()) {
      parts.push(customDetails.trim());
    }

    // Quality markers
    parts.push('front facing view', 'full body visible', 'centered', 'clean pixel art');

    return parts.join(', ');
  }, [config, customDetails]);

  // Randomize all options
  const randomizeCharacter = () => {
    const randomFrom = <T extends { id: string }>(arr: T[]) =>
      arr[Math.floor(Math.random() * arr.length)].id;

    setConfig({
      bodyType: randomFrom(BODY_TYPES),
      skinColor: randomFrom(SKIN_COLORS),
      hairStyle: randomFrom(HAIR_STYLES),
      hairColor: randomFrom(HAIR_COLORS),
      outfitType: randomFrom(OUTFIT_TYPES),
      outfitColor: randomFrom(OUTFIT_COLORS),
      weaponType: randomFrom(WEAPON_TYPES),
      accessoryType: randomFrom(ACCESSORY_TYPES),
    });
    toast.success('Character randomized!');
  };

  // Reset to defaults
  const resetCharacter = () => {
    setConfig(DEFAULT_CONFIG);
    setCustomDetails('');
    toast.success('Character reset');
  };

  // Build prompt from a specific config
  const buildPromptFromConfig = (cfg: CharacterConfig) => {
    const body = BODY_TYPES.find(b => b.id === cfg.bodyType);
    const skin = SKIN_COLORS.find(s => s.id === cfg.skinColor);
    const hair = HAIR_STYLES.find(h => h.id === cfg.hairStyle);
    const hairColor = HAIR_COLORS.find(c => c.id === cfg.hairColor);
    const outfit = OUTFIT_TYPES.find(o => o.id === cfg.outfitType);
    const outfitColor = OUTFIT_COLORS.find(c => c.id === cfg.outfitColor);
    const weapon = WEAPON_TYPES.find(w => w.id === cfg.weaponType);
    const accessory = ACCESSORY_TYPES.find(a => a.id === cfg.accessoryType);

    const parts: string[] = ['pixel art character sprite'];
    if (body) parts.push(body.desc);
    if (skin && !['skeleton', 'robot', 'slime'].includes(cfg.bodyType)) {
      parts.push(`${skin.label.toLowerCase()} skin`);
    }
    if (hair && cfg.hairStyle !== 'none') {
      parts.push(`${hairColor?.label.toLowerCase() || ''} ${hair.desc}`);
    }
    if (outfit && cfg.outfitType !== 'none') {
      parts.push(`${outfitColor?.label.toLowerCase() || ''} ${outfit.desc}`);
    }
    if (weapon && cfg.weaponType !== 'none') {
      parts.push(`holding ${weapon.desc}`);
    }
    if (accessory && cfg.accessoryType !== 'none') {
      parts.push(`with ${accessory.desc}`);
    }
    parts.push('front facing view', 'full body visible', 'centered', 'clean pixel art');
    return parts.join(', ');
  };

  // Quick generate from preset (one-click)
  const handleQuickGenerate = async (preset: typeof CHARACTER_PRESETS[0]) => {
    if (!session?.user) {
      toast.error('Please sign in to generate');
      return;
    }

    setGeneratingPreset(preset.label);
    setGeneratedImages([]);
    setConfig(preset.config);

    try {
      const prompt = buildPromptFromConfig(preset.config);
      console.log('Quick generate:', preset.label, prompt);

      const response = await fetch('/api/generate/sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          size: 64,
          style: 'default',
          removeBackground: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Generation failed');
        return;
      }

      if (data.generation?.imageUrl) {
        setGeneratedImages([data.generation.imageUrl]);
        toast.success(`${preset.label} generated!`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate character');
    } finally {
      setGeneratingPreset(null);
    }
  };

  // Generate the character
  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error('Please sign in to generate');
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const prompt = buildCharacterPrompt();
      console.log('Character prompt:', prompt);

      const response = await fetch('/api/generate/sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          size: 64,
          style: 'default',
          removeBackground: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error('Insufficient credits');
        } else {
          toast.error(data.error || 'Generation failed');
        }
        return;
      }

      if (data.generation?.imageUrl) {
        setGeneratedImages([data.generation.imageUrl]);
        toast.success('Character generated!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate character');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate 4 variations
  const handleGenerateVariations = async () => {
    if (!session?.user) {
      toast.error('Please sign in to generate');
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const prompt = buildCharacterPrompt();
      const images: string[] = [];

      // Generate 4 variations with different seeds
      for (let i = 0; i < 4; i++) {
        toast.info(`Generating variation ${i + 1}/4...`, { duration: 2000 });

        const response = await fetch('/api/generate/sprite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            size: 64,
            style: 'default',
            removeBackground: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 402) {
            toast.error(`Insufficient credits at variation ${i + 1}`);
            break;
          }
          continue;
        }

        if (data.generation?.imageUrl) {
          images.push(data.generation.imageUrl);
        }
      }

      setGeneratedImages(images);
      if (images.length > 0) {
        toast.success(`Generated ${images.length} variations!`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate variations');
    } finally {
      setIsGenerating(false);
    }
  };

  const ColorPicker = ({
    colors,
    selected,
    onSelect,
  }: {
    colors: { id: string; label: string; color: string }[];
    selected: string;
    onSelect: (id: string) => void;
  }) => (
    <div className="flex gap-1 flex-wrap">
      {colors.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`w-6 h-6 rounded border-2 transition-all ${
            selected === c.id
              ? 'border-white scale-110'
              : 'border-transparent hover:border-gray-500'
          }`}
          style={{ backgroundColor: c.color }}
          title={c.label}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <User className="w-4 h-4 text-cyan-400" />
        <span className="font-semibold text-sm">Character Creator</span>
        {session?.user && (
          <span className="ml-auto text-xs text-gray-400">
            {session.user.credits} credits
          </span>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="p-3 space-y-3">
          {/* One-Click Presets */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">One-Click Generate</label>
            <div className="grid grid-cols-4 gap-1">
              {CHARACTER_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className={`h-12 text-xs flex-col p-1 ${
                    generatingPreset === preset.label ? 'ring-2 ring-cyan-500' : ''
                  }`}
                  onClick={() => handleQuickGenerate(preset)}
                  disabled={isGenerating || generatingPreset !== null}
                  title={`Generate ${preset.label} (1 credit)`}
                >
                  {generatingPreset === preset.label ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-[9px]">{preset.label}</span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Toggle advanced customization */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Custom Character</span>
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>

          {showAdvanced && (
            <>
              {/* Quick actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={randomizeCharacter}
                >
                  <Shuffle className="w-3 h-3 mr-1" /> Random
                </Button>
                <Button
                  variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={resetCharacter}
            >
              <RotateCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>

          {/* Body section */}
          <Collapsible open={isBodyExpanded} onOpenChange={setIsBodyExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isBodyExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <User className="w-3 h-3" /> Body
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Type</label>
                <Select value={config.bodyType} onValueChange={(v) => updateConfig('bodyType', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_TYPES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Skin Color</label>
                <ColorPicker
                  colors={SKIN_COLORS}
                  selected={config.skinColor}
                  onSelect={(v) => updateConfig('skinColor', v)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Hair section */}
          <Collapsible open={isHairExpanded} onOpenChange={setIsHairExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isHairExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Crown className="w-3 h-3" /> Hair
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Style</label>
                <Select value={config.hairStyle} onValueChange={(v) => updateConfig('hairStyle', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HAIR_STYLES.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Color</label>
                <ColorPicker
                  colors={HAIR_COLORS}
                  selected={config.hairColor}
                  onSelect={(v) => updateConfig('hairColor', v)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Outfit section */}
          <Collapsible open={isOutfitExpanded} onOpenChange={setIsOutfitExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isOutfitExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Shirt className="w-3 h-3" /> Outfit
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Type</label>
                <Select value={config.outfitType} onValueChange={(v) => updateConfig('outfitType', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTFIT_TYPES.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Color</label>
                <ColorPicker
                  colors={OUTFIT_COLORS}
                  selected={config.outfitColor}
                  onSelect={(v) => updateConfig('outfitColor', v)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Equipment section */}
          <Collapsible open={isEquipExpanded} onOpenChange={setIsEquipExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-gray-200">
              {isEquipExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Sword className="w-3 h-3" /> Equipment
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Weapon</label>
                <Select value={config.weaponType} onValueChange={(v) => updateConfig('weaponType', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAPON_TYPES.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Accessory</label>
                <Select value={config.accessoryType} onValueChange={(v) => updateConfig('accessoryType', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESSORY_TYPES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Custom details */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Extra Details</label>
            <Input
              placeholder="e.g., battle-scarred, glowing eyes..."
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          {/* Generate buttons */}
          <div className="space-y-2">
            <Button
              className="w-full h-8 bg-gradient-to-r from-cyan-600 to-blue-600"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Character (1 credit)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-7 text-xs"
              onClick={handleGenerateVariations}
              disabled={isGenerating}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate 4 Variations (4 credits)
            </Button>
          </div>
            </>
          )}

          {/* Generated results */}
          {generatedImages.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 block">
                Generated ({generatedImages.length})
              </label>
              <div className="grid grid-cols-4 gap-1">
                {generatedImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      loadFromUrl(url);
                      toast.success('Loaded to canvas');
                    }}
                    className="aspect-square bg-[#0f0f1a] rounded overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all"
                    title="Click to load on canvas"
                  >
                    <img
                      src={url}
                      alt={`Variation ${i + 1}`}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 text-center">
                Click to load on canvas
              </p>
            </div>
          )}

          {!session?.user && (
            <p className="text-xs text-gray-500 text-center">
              Sign in to create characters
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
