'use client';

import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  Merge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LayersPanel() {
  const {
    frames,
    currentFrameIndex,
    currentLayerIndex,
    selectLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    setLayerVisibility,
    setLayerOpacity,
    setLayerLocked,
    renameLayer,
    mergeLayerDown,
  } = useCanvasStore();

  const frame = frames[currentFrameIndex];
  const layers = frame?.layers || [];

  return (
    <div className="w-64 bg-[#1a1a2e] border-l border-[#2a2a4e] flex flex-col">
      <div className="p-3 border-b border-[#2a2a4e] flex items-center justify-between">
        <h3 className="font-semibold text-sm">Layers</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={addLayer}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, reversedIndex) => {
          const index = layers.length - 1 - reversedIndex;
          const isSelected = index === currentLayerIndex;

          return (
            <div
              key={layer.id}
              className={cn(
                'p-2 border-b border-[#2a2a4e] cursor-pointer hover:bg-[#252540]',
                isSelected && 'bg-purple-600/30'
              )}
              onClick={() => selectLayer(index)}
            >
              <div className="flex items-center gap-2">
                {/* Visibility */}
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayerVisibility(index, !layer.visible);
                  }}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 opacity-50" />
                  )}
                </button>

                {/* Lock */}
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayerLocked(index, !layer.locked);
                  }}
                >
                  {layer.locked ? (
                    <Lock className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Unlock className="w-4 h-4 opacity-50" />
                  )}
                </button>

                {/* Layer name */}
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => renameLayer(index, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-sm outline-none border-none"
                />

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index < layers.length - 1) moveLayer(index, index + 1);
                    }}
                    disabled={index >= layers.length - 1}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index > 0) moveLayer(index, index - 1);
                    }}
                    disabled={index <= 0}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Opacity slider - only for selected layer */}
              {isSelected && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </span>
                  <Slider
                    value={[layer.opacity * 100]}
                    onValueChange={([v]) => setLayerOpacity(index, v / 100)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              )}

              {/* Layer actions - only for selected layer */}
              {isSelected && (
                <div className="mt-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(index);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Duplicate
                  </Button>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        mergeLayerDown(index);
                      }}
                    >
                      <Merge className="w-3 h-3 mr-1" /> Merge
                    </Button>
                  )}
                  {layers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(index);
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
