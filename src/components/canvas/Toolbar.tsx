'use client';

import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Tool, colorToHex, hexToColor } from '@/lib/canvas/types';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Circle,
  Minus,
  Move,
  MousePointer2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Trash2,
  Download,
  Upload,
  Wand2,
  CircleDot,
  SquareDashed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const tools: { id: Tool; icon: typeof Pencil; label: string; shortcut: string }[] = [
  { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { id: 'bucket', icon: PaintBucket, label: 'Fill', shortcut: 'G' },
  { id: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' },
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'M' },
  { id: 'move', icon: Move, label: 'Move', shortcut: 'V' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'mask', icon: Wand2, label: 'Inpaint Mask', shortcut: 'K' },
];

export function Toolbar() {
  const {
    tool,
    setTool,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    brushSize,
    setBrushSize,
    brushShape,
    setBrushShape,
    shapeFilled,
    setShapeFilled,
    zoom,
    setZoom,
    gridVisible,
    toggleGrid,
    undo,
    redo,
    clear,
    history,
    historyIndex,
    getImageData,
    width,
    height,
  } = useCanvasStore();

  const handleExport = () => {
    const imageData = getImageData();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement('a');
    link.download = `pixel-art-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      await useCanvasStore.getState().loadFromUrl(url);
      URL.revokeObjectURL(url);
    };
    input.click();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-2 p-2 bg-[#1a1a2e] border-r border-[#2a2a4e] h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a4e] scrollbar-track-transparent">
        {/* Tools */}
        <div className="flex flex-col gap-1">
          {tools.map(({ id, icon: Icon, label, shortcut }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'w-10 h-10',
                    tool === id && 'bg-purple-600 hover:bg-purple-700'
                  )}
                  onClick={() => setTool(id)}
                >
                  <Icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  {label} ({shortcut})
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="border-t border-[#2a2a4e] my-2" />

        {/* Colors */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-10 h-10">
            {/* Primary color */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="absolute top-0 left-0 w-7 h-7 rounded border-2 border-white shadow-lg z-10"
                  style={{ backgroundColor: colorToHex(primaryColor) }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = colorToHex(primaryColor);
                    input.onchange = (e) =>
                      setPrimaryColor(hexToColor((e.target as HTMLInputElement).value));
                    input.click();
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="right">Primary Color</TooltipContent>
            </Tooltip>

            {/* Secondary color */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="absolute bottom-0 right-0 w-7 h-7 rounded border-2 border-gray-400"
                  style={{ backgroundColor: colorToHex(secondaryColor) }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = colorToHex(secondaryColor);
                    input.onchange = (e) =>
                      setSecondaryColor(hexToColor((e.target as HTMLInputElement).value));
                    input.click();
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="right">Secondary Color</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={swapColors} className="text-xs">
                Swap
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Swap Colors (X)</TooltipContent>
          </Tooltip>
        </div>

        <div className="border-t border-[#2a2a4e] my-2" />

        {/* Brush Size */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">Size: {brushSize}</span>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={1}
            max={16}
            step={1}
            className="w-8"
            orientation="vertical"
          />
        </div>

        {/* Brush Shape Toggle */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('w-8 h-8', brushShape === 'circle' && 'bg-purple-600/50')}
                onClick={() => setBrushShape(brushShape === 'square' ? 'circle' : 'square')}
              >
                {brushShape === 'circle' ? (
                  <CircleDot className="w-4 h-4" />
                ) : (
                  <SquareDashed className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Brush Shape: {brushShape === 'circle' ? 'Circle' : 'Square'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Shape Fill Toggle (only show for shape tools) */}
        {(tool === 'rectangle' || tool === 'ellipse') && (
          <div className="flex flex-col items-center gap-1 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('w-8 h-8', shapeFilled && 'bg-purple-600/50')}
                  onClick={() => setShapeFilled(!shapeFilled)}
                >
                  {shapeFilled ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {shapeFilled ? 'Filled Shape' : 'Outline Shape'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="border-t border-[#2a2a4e] my-2" />

        {/* Zoom */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">{zoom}x</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setZoom(zoom + 2)}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom In (+)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setZoom(zoom - 2)}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom Out (-)</TooltipContent>
          </Tooltip>
        </div>

        <div className="border-t border-[#2a2a4e] my-2" />

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('w-10 h-10', gridVisible && 'bg-purple-600/50')}
                onClick={toggleGrid}
              >
                <Grid3X3 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle Grid</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10"
                onClick={undo}
                disabled={historyIndex < 0}
              >
                <Undo2 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 text-red-400 hover:text-red-300"
                onClick={clear}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Clear Layer</TooltipContent>
          </Tooltip>
        </div>

        <div className="border-t border-[#2a2a4e] my-2" />

        {/* Import/Export */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleImport}>
                <Upload className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Import Image</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 text-green-400 hover:text-green-300"
                onClick={handleExport}
              >
                <Download className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Export PNG</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
