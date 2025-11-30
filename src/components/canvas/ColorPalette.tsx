'use client';

import { useState } from 'react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { DEFAULT_PALETTES, colorToHex, hexToColor, Color } from '@/lib/canvas/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ColorPalette() {
  const { primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor } =
    useCanvasStore();

  const [selectedPalette, setSelectedPalette] = useState(DEFAULT_PALETTES[2].id); // PICO-8
  const [customColors, setCustomColors] = useState<Color[]>([]);

  const palette = DEFAULT_PALETTES.find((p) => p.id === selectedPalette) || DEFAULT_PALETTES[0];

  const handleColorClick = (color: Color, e: React.MouseEvent) => {
    if (e.button === 2) {
      setSecondaryColor(color);
    } else {
      setPrimaryColor(color);
    }
  };

  const addCustomColor = () => {
    if (!customColors.some((c) => colorToHex(c) === colorToHex(primaryColor))) {
      setCustomColors([...customColors, primaryColor]);
    }
  };

  const removeCustomColor = (index: number) => {
    setCustomColors(customColors.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e] p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Color Palette</h3>
        <Select value={selectedPalette} onValueChange={setSelectedPalette}>
          <SelectTrigger className="w-32 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_PALETTES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Palette colors */}
      <div className="flex flex-wrap gap-1 mb-3">
        {palette.colors.map((color, index) => (
          <button
            key={index}
            className={cn(
              'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
              colorToHex(color) === colorToHex(primaryColor)
                ? 'border-white'
                : 'border-transparent'
            )}
            style={{ backgroundColor: colorToHex(color) }}
            onClick={(e) => handleColorClick(color, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleColorClick(color, e);
            }}
          />
        ))}
      </div>

      {/* Custom colors */}
      {customColors.length > 0 && (
        <>
          <div className="text-xs text-gray-400 mb-2">Custom Colors</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {customColors.map((color, index) => (
              <div key={index} className="relative group">
                <button
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
                    colorToHex(color) === colorToHex(primaryColor)
                      ? 'border-white'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: colorToHex(color) }}
                  onClick={(e) => handleColorClick(color, e)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleColorClick(color, e);
                  }}
                />
                <button
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center"
                  onClick={() => removeCustomColor(index)}
                >
                  <Trash2 className="w-2 h-2" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add custom color button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={addCustomColor}
      >
        <Plus className="w-3 h-3 mr-1" /> Add Current Color
      </Button>

      {/* Current colors preview */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Primary</div>
          <div
            className="h-6 rounded border border-[#2a2a4e]"
            style={{ backgroundColor: colorToHex(primaryColor) }}
          />
          <div className="text-xs text-gray-500 mt-1">{colorToHex(primaryColor)}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Secondary</div>
          <div
            className="h-6 rounded border border-[#2a2a4e]"
            style={{ backgroundColor: colorToHex(secondaryColor) }}
          />
          <div className="text-xs text-gray-500 mt-1">{colorToHex(secondaryColor)}</div>
        </div>
      </div>
    </div>
  );
}
