'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PixelCanvas,
  Toolbar,
  LayersPanel,
  ColorPalette,
  AnimationTimeline,
  AIGeneratePanel,
  AIAnimatePanel,
  SkeletonPanel,
  InpaintPanel,
  StyleMatchPanel,
  SpriteRotationPanel,
  TilesetPanel,
  CharacterCreatorPanel,
} from '@/components/canvas';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, FileImage, Home } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { width, height, reset } = useCanvasStore();
  const [newWidth, setNewWidth] = useState(width.toString());
  const [newHeight, setNewHeight] = useState(height.toString());

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'p':
            store.setTool('pencil');
            break;
          case 'e':
            store.setTool('eraser');
            break;
          case 'g':
            store.setTool('bucket');
            break;
          case 'i':
            store.setTool('eyedropper');
            break;
          case 'm':
            store.setTool('select');
            break;
          case 'v':
            store.setTool('move');
            break;
          case 'l':
            store.setTool('line');
            break;
          case 'r':
            store.setTool('rectangle');
            break;
          case 'o':
            store.setTool('ellipse');
            break;
          case 'k':
            store.setTool('mask');
            break;
          case 'x':
            store.swapColors();
            break;
          case '+':
          case '=':
            store.setZoom(store.zoom + 2);
            break;
          case '-':
            store.setZoom(store.zoom - 2);
            break;
          case '[':
            store.setBrushSize(store.brushSize - 1);
            break;
          case ']':
            store.setBrushSize(store.brushSize + 1);
            break;
        }
      }

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              store.redo();
            } else {
              store.undo();
            }
            break;
          case 'y':
            e.preventDefault();
            store.redo();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewCanvas = () => {
    const w = parseInt(newWidth) || 64;
    const h = parseInt(newHeight) || 64;
    reset(Math.min(512, Math.max(8, w)), Math.min(512, Math.max(8, h)));
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f0f1a] text-white overflow-hidden">
      {/* Top bar */}
      <div className="h-12 bg-[#1a1a2e] border-b border-[#2a2a4e] flex items-center px-4 gap-4">
        <Link href="/" className="text-purple-400 hover:text-purple-300">
          <Home className="w-5 h-5" />
        </Link>

        <div className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          PixelForge Editor
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{width}×{height}</span>
        </div>

        {/* New canvas dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <FileImage className="w-4 h-4 mr-2" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Canvas</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Width</label>
                <Input
                  type="number"
                  value={newWidth}
                  onChange={(e) => setNewWidth(e.target.value)}
                  min={8}
                  max={512}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Height</label>
                <Input
                  type="number"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  min={8}
                  max={512}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setNewWidth('32');
                  setNewHeight('32');
                }}
              >
                32×32
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setNewWidth('64');
                  setNewHeight('64');
                }}
              >
                64×64
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setNewWidth('128');
                  setNewHeight('128');
                }}
              >
                128×128
              </Button>
            </div>
            <Button className="w-full mt-4" onClick={handleNewCanvas}>
              Create Canvas
            </Button>
          </DialogContent>
        </Dialog>

        {session?.user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {session.user.credits} credits
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              {session.user.name?.[0] || session.user.email?.[0] || '?'}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        <Toolbar />

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col">
          <PixelCanvas />
          <AnimationTimeline />
        </div>

        {/* Right panels */}
        <div className="w-72 flex flex-col border-l border-[#2a2a4e] overflow-y-auto">
          <AIGeneratePanel />
          <CharacterCreatorPanel />
          <AIAnimatePanel />
          <InpaintPanel />
          <StyleMatchPanel />
          <SpriteRotationPanel />
          <TilesetPanel />
          <SkeletonPanel />
          <ColorPalette />
          <LayersPanel />
        </div>
      </div>
    </div>
  );
}
