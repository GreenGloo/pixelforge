// ==========================================
// Canvas State Management with Zustand
// ==========================================

import { create } from 'zustand';
import {
  CanvasState,
  Color,
  Tool,
  Layer,
  Frame,
  HistoryEntry,
  OnionSkinSettings,
  createEmptyLayer,
  createEmptyFrame,
  createInitialState,
} from './types';

interface CanvasStore extends CanvasState {
  // History
  history: HistoryEntry[];
  historyIndex: number;
  maxHistory: number;

  // Mask for inpainting
  maskData: Uint8Array | null;
  showMask: boolean;
  maskTool: 'brush' | 'eraser';
  maskBrushSize: number;

  // Actions - Canvas
  setDimensions: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;

  // Actions - Tools
  setTool: (tool: Tool) => void;
  setPrimaryColor: (color: Color) => void;
  setSecondaryColor: (color: Color) => void;
  swapColors: () => void;
  setBrushSize: (size: number) => void;

  // Actions - Drawing
  setPixel: (x: number, y: number, color: Color) => void;
  setPixels: (pixels: { x: number; y: number; color: Color }[]) => void;
  fillArea: (x: number, y: number, color: Color) => void;
  clear: () => void;

  // Actions - Layers
  addLayer: () => void;
  removeLayer: (index: number) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerVisibility: (index: number, visible: boolean) => void;
  setLayerOpacity: (index: number, opacity: number) => void;
  setLayerLocked: (index: number, locked: boolean) => void;
  renameLayer: (index: number, name: string) => void;
  selectLayer: (index: number) => void;
  duplicateLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;

  // Actions - Frames
  addFrame: () => void;
  removeFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  selectFrame: (index: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;

  // Actions - Onion Skin
  toggleOnionSkin: () => void;
  setOnionSkinSettings: (settings: Partial<OnionSkinSettings>) => void;

  // Actions - Mask
  setMaskData: (mask: Uint8Array | null) => void;
  setMaskPixel: (x: number, y: number, value: number) => void;
  setMaskPixels: (pixels: { x: number; y: number; value: number }[]) => void;
  setShowMask: (show: boolean) => void;
  setMaskTool: (tool: 'brush' | 'eraser') => void;
  setMaskBrushSize: (size: number) => void;
  clearMask: () => void;

  // Actions - History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Actions - Import/Export
  loadFromImageData: (imageData: ImageData) => void;
  loadFromUrl: (url: string) => Promise<void>;
  getImageData: () => ImageData;
  setFrames: (frames: Frame[]) => void;
  reset: (width?: number, height?: number) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...createInitialState(64, 64),
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  // Mask state
  maskData: null,
  showMask: true,
  maskTool: 'brush',
  maskBrushSize: 8,

  // Canvas actions
  setDimensions: (width, height) => {
    const state = get();
    const newFrames = state.frames.map((frame) => ({
      ...frame,
      layers: frame.layers.map((layer) => ({
        ...layer,
        pixels: resizePixels(layer.pixels, state.width, state.height, width, height),
      })),
    }));
    set({ width, height, frames: newFrames });
  },

  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(32, zoom)) }),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),

  // Tool actions
  setTool: (tool) => set({ tool }),
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () =>
    set((state) => ({
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
    })),
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(16, size)) }),

  // Drawing actions
  setPixel: (x, y, color) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    if (layer.locked || !layer.visible) return;
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    const newPixels = new Uint8ClampedArray(layer.pixels);
    const idx = (y * state.width + x) * 4;
    newPixels[idx] = color.r;
    newPixels[idx + 1] = color.g;
    newPixels[idx + 2] = color.b;
    newPixels[idx + 3] = color.a;

    const newLayers = [...frame.layers];
    newLayers[state.currentLayerIndex] = { ...layer, pixels: newPixels };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  setPixels: (pixels) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    if (layer.locked || !layer.visible) return;

    const newPixels = new Uint8ClampedArray(layer.pixels);

    for (const { x, y, color } of pixels) {
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
      const idx = (y * state.width + x) * 4;
      newPixels[idx] = color.r;
      newPixels[idx + 1] = color.g;
      newPixels[idx + 2] = color.b;
      newPixels[idx + 3] = color.a;
    }

    const newLayers = [...frame.layers];
    newLayers[state.currentLayerIndex] = { ...layer, pixels: newPixels };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  fillArea: (startX, startY, fillColor) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    if (layer.locked || !layer.visible) return;
    if (startX < 0 || startX >= state.width || startY < 0 || startY >= state.height) return;

    const newPixels = new Uint8ClampedArray(layer.pixels);
    const width = state.width;
    const height = state.height;

    const getPixel = (x: number, y: number): Color => {
      const idx = (y * width + x) * 4;
      return {
        r: newPixels[idx],
        g: newPixels[idx + 1],
        b: newPixels[idx + 2],
        a: newPixels[idx + 3],
      };
    };

    const setPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      newPixels[idx] = fillColor.r;
      newPixels[idx + 1] = fillColor.g;
      newPixels[idx + 2] = fillColor.b;
      newPixels[idx + 3] = fillColor.a;
    };

    const targetColor = getPixel(startX, startY);

    // Don't fill if same color
    if (
      targetColor.r === fillColor.r &&
      targetColor.g === fillColor.g &&
      targetColor.b === fillColor.b &&
      targetColor.a === fillColor.a
    ) {
      return;
    }

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixel = getPixel(x, y);
      if (
        pixel.r !== targetColor.r ||
        pixel.g !== targetColor.g ||
        pixel.b !== targetColor.b ||
        pixel.a !== targetColor.a
      ) {
        continue;
      }

      visited.add(key);
      setPixel(x, y);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    const newLayers = [...frame.layers];
    newLayers[state.currentLayerIndex] = { ...layer, pixels: newPixels };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  clear: () => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    if (layer.locked) return;

    const newLayers = [...frame.layers];
    newLayers[state.currentLayerIndex] = {
      ...layer,
      pixels: new Uint8ClampedArray(state.width * state.height * 4),
    };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  // Layer actions
  addLayer: () => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const newLayer = createEmptyLayer(
      state.width,
      state.height,
      `Layer ${frame.layers.length + 1}`
    );

    const newLayers = [...frame.layers, newLayer];
    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, currentLayerIndex: newLayers.length - 1 });
  },

  removeLayer: (index) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    if (frame.layers.length <= 1) return;

    const newLayers = frame.layers.filter((_, i) => i !== index);
    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({
      frames: newFrames,
      currentLayerIndex: Math.min(state.currentLayerIndex, newLayers.length - 1),
    });
  },

  moveLayer: (fromIndex, toIndex) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    if (fromIndex < 0 || fromIndex >= frame.layers.length) return;
    if (toIndex < 0 || toIndex >= frame.layers.length) return;

    const newLayers = [...frame.layers];
    const [removed] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, removed);

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, currentLayerIndex: toIndex });
  },

  setLayerVisibility: (index, visible) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    const newLayers = [...frame.layers];
    newLayers[index] = { ...newLayers[index], visible };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  setLayerOpacity: (index, opacity) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    const newLayers = [...frame.layers];
    newLayers[index] = { ...newLayers[index], opacity: Math.max(0, Math.min(1, opacity)) };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  setLayerLocked: (index, locked) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    const newLayers = [...frame.layers];
    newLayers[index] = { ...newLayers[index], locked };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  renameLayer: (index, name) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    const newLayers = [...frame.layers];
    newLayers[index] = { ...newLayers[index], name };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames });
  },

  selectLayer: (index) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    if (index >= 0 && index < frame.layers.length) {
      set({ currentLayerIndex: index });
    }
  },

  duplicateLayer: (index) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[index];

    const newLayer: Layer = {
      ...layer,
      id: crypto.randomUUID(),
      name: `${layer.name} copy`,
      pixels: new Uint8ClampedArray(layer.pixels),
    };

    const newLayers = [...frame.layers];
    newLayers.splice(index + 1, 0, newLayer);

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, currentLayerIndex: index + 1 });
  },

  mergeLayerDown: (index) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    if (index <= 0) return;

    const topLayer = frame.layers[index];
    const bottomLayer = frame.layers[index - 1];

    const mergedPixels = new Uint8ClampedArray(bottomLayer.pixels);

    for (let i = 0; i < mergedPixels.length; i += 4) {
      const topAlpha = (topLayer.pixels[i + 3] / 255) * topLayer.opacity;
      const bottomAlpha = mergedPixels[i + 3] / 255;

      if (topAlpha > 0) {
        const outAlpha = topAlpha + bottomAlpha * (1 - topAlpha);
        if (outAlpha > 0) {
          mergedPixels[i] = (topLayer.pixels[i] * topAlpha + mergedPixels[i] * bottomAlpha * (1 - topAlpha)) / outAlpha;
          mergedPixels[i + 1] = (topLayer.pixels[i + 1] * topAlpha + mergedPixels[i + 1] * bottomAlpha * (1 - topAlpha)) / outAlpha;
          mergedPixels[i + 2] = (topLayer.pixels[i + 2] * topAlpha + mergedPixels[i + 2] * bottomAlpha * (1 - topAlpha)) / outAlpha;
          mergedPixels[i + 3] = outAlpha * 255;
        }
      }
    }

    const newLayers = frame.layers.filter((_, i) => i !== index);
    newLayers[index - 1] = { ...bottomLayer, pixels: mergedPixels };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, currentLayerIndex: index - 1 });
  },

  // Frame actions
  addFrame: () => {
    const state = get();
    const newFrame = createEmptyFrame(state.width, state.height);
    const newFrames = [...state.frames, newFrame];
    set({ frames: newFrames, currentFrameIndex: newFrames.length - 1 });
  },

  removeFrame: (index) => {
    const state = get();
    if (state.frames.length <= 1) return;

    const newFrames = state.frames.filter((_, i) => i !== index);
    set({
      frames: newFrames,
      currentFrameIndex: Math.min(state.currentFrameIndex, newFrames.length - 1),
    });
  },

  duplicateFrame: (index) => {
    const state = get();
    const frame = state.frames[index];

    const newFrame: Frame = {
      id: crypto.randomUUID(),
      duration: frame.duration,
      layers: frame.layers.map((layer) => ({
        ...layer,
        id: crypto.randomUUID(),
        pixels: new Uint8ClampedArray(layer.pixels),
      })),
    };

    const newFrames = [...state.frames];
    newFrames.splice(index + 1, 0, newFrame);

    set({ frames: newFrames, currentFrameIndex: index + 1 });
  },

  selectFrame: (index) => {
    const state = get();
    if (index >= 0 && index < state.frames.length) {
      const frame = state.frames[index];
      set({
        currentFrameIndex: index,
        currentLayerIndex: Math.min(state.currentLayerIndex, frame.layers.length - 1),
      });
    }
  },

  setFrameDuration: (index, duration) => {
    const state = get();
    const newFrames = [...state.frames];
    newFrames[index] = { ...newFrames[index], duration: Math.max(10, duration) };
    set({ frames: newFrames });
  },

  moveFrame: (fromIndex, toIndex) => {
    const state = get();
    if (fromIndex < 0 || fromIndex >= state.frames.length) return;
    if (toIndex < 0 || toIndex >= state.frames.length) return;

    const newFrames = [...state.frames];
    const [removed] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, removed);

    set({ frames: newFrames, currentFrameIndex: toIndex });
  },

  // Onion skin actions
  toggleOnionSkin: () => {
    set((state) => ({
      onionSkin: { ...state.onionSkin, enabled: !state.onionSkin.enabled },
    }));
  },

  setOnionSkinSettings: (settings) => {
    set((state) => ({
      onionSkin: { ...state.onionSkin, ...settings },
    }));
  },

  // Mask actions
  setMaskData: (mask) => set({ maskData: mask }),

  setMaskPixel: (x, y, value) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    let mask = state.maskData;
    if (!mask) {
      mask = new Uint8Array(state.width * state.height);
    } else {
      mask = new Uint8Array(mask);
    }

    mask[y * state.width + x] = value;
    set({ maskData: mask });
  },

  setMaskPixels: (pixels) => {
    const state = get();
    let mask = state.maskData;
    if (!mask) {
      mask = new Uint8Array(state.width * state.height);
    } else {
      mask = new Uint8Array(mask);
    }

    for (const { x, y, value } of pixels) {
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
      mask[y * state.width + x] = value;
    }

    set({ maskData: mask });
  },

  setShowMask: (show) => set({ showMask: show }),

  setMaskTool: (tool) => set({ maskTool: tool }),

  setMaskBrushSize: (size) => set({ maskBrushSize: Math.max(1, Math.min(32, size)) }),

  clearMask: () => set({ maskData: null }),

  // History actions
  pushHistory: () => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    const entry: HistoryEntry = {
      type: 'pixels',
      frameIndex: state.currentFrameIndex,
      layerIndex: state.currentLayerIndex,
      previousData: new Uint8ClampedArray(layer.pixels),
      currentData: new Uint8ClampedArray(layer.pixels),
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);

    if (newHistory.length > state.maxHistory) {
      newHistory.shift();
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return;

    const entry = state.history[state.historyIndex];
    const frame = state.frames[entry.frameIndex];
    const layer = frame.layers[entry.layerIndex];

    const newLayers = [...frame.layers];
    newLayers[entry.layerIndex] = { ...layer, pixels: new Uint8ClampedArray(entry.previousData) };

    const newFrames = [...state.frames];
    newFrames[entry.frameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, historyIndex: state.historyIndex - 1 });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const entry = state.history[state.historyIndex + 1];
    const frame = state.frames[entry.frameIndex];
    const layer = frame.layers[entry.layerIndex];

    const newLayers = [...frame.layers];
    newLayers[entry.layerIndex] = { ...layer, pixels: new Uint8ClampedArray(entry.currentData) };

    const newFrames = [...state.frames];
    newFrames[entry.frameIndex] = { ...frame, layers: newLayers };

    set({ frames: newFrames, historyIndex: state.historyIndex + 1 });
  },

  // Import/Export
  loadFromImageData: (imageData) => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];
    const layer = frame.layers[state.currentLayerIndex];

    const newLayers = [...frame.layers];
    newLayers[state.currentLayerIndex] = {
      ...layer,
      pixels: new Uint8ClampedArray(imageData.data),
    };

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = { ...frame, layers: newLayers };

    set({
      width: imageData.width,
      height: imageData.height,
      frames: newFrames,
    });
  },

  loadFromUrl: async (url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    get().loadFromImageData(imageData);
  },

  getImageData: () => {
    const state = get();
    const frame = state.frames[state.currentFrameIndex];

    // Composite all visible layers
    const composited = new Uint8ClampedArray(state.width * state.height * 4);

    for (const layer of frame.layers) {
      if (!layer.visible) continue;

      for (let i = 0; i < composited.length; i += 4) {
        const srcAlpha = (layer.pixels[i + 3] / 255) * layer.opacity;
        const dstAlpha = composited[i + 3] / 255;

        if (srcAlpha > 0) {
          const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
          if (outAlpha > 0) {
            composited[i] = (layer.pixels[i] * srcAlpha + composited[i] * dstAlpha * (1 - srcAlpha)) / outAlpha;
            composited[i + 1] = (layer.pixels[i + 1] * srcAlpha + composited[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha;
            composited[i + 2] = (layer.pixels[i + 2] * srcAlpha + composited[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha;
            composited[i + 3] = outAlpha * 255;
          }
        }
      }
    }

    return new ImageData(composited, state.width, state.height);
  },

  setFrames: (frames) => set({ frames }),

  reset: (width = 64, height = 64) => {
    set({
      ...createInitialState(width, height),
      history: [],
      historyIndex: -1,
    });
  },
}));

// Helper function to resize pixel data
function resizePixels(
  pixels: Uint8ClampedArray,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): Uint8ClampedArray {
  const newPixels = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
    for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
      const oldIdx = (y * oldWidth + x) * 4;
      const newIdx = (y * newWidth + x) * 4;
      newPixels[newIdx] = pixels[oldIdx];
      newPixels[newIdx + 1] = pixels[oldIdx + 1];
      newPixels[newIdx + 2] = pixels[oldIdx + 2];
      newPixels[newIdx + 3] = pixels[oldIdx + 3];
    }
  }

  return newPixels;
}
