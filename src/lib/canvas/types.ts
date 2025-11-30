// ==========================================
// Canvas Types and Interfaces
// ==========================================

export type Tool =
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'select'
  | 'move'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'mask';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  pixels: Uint8ClampedArray; // RGBA data
}

export interface Frame {
  id: string;
  layers: Layer[];
  duration: number; // ms
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OnionSkinSettings {
  enabled: boolean;
  framesBefore: number;
  framesAfter: number;
  opacityBefore: number;
  opacityAfter: number;
  tintBefore: Color;
  tintAfter: Color;
}

export interface CanvasState {
  width: number;
  height: number;
  frames: Frame[];
  currentFrameIndex: number;
  currentLayerIndex: number;
  zoom: number;
  gridVisible: boolean;
  tool: Tool;
  primaryColor: Color;
  secondaryColor: Color;
  brushSize: number;
  selection: Selection | null;
  onionSkin: OnionSkinSettings;
}

export interface HistoryEntry {
  type: 'pixels' | 'layer' | 'frame';
  frameIndex: number;
  layerIndex: number;
  previousData: Uint8ClampedArray;
  currentData: Uint8ClampedArray;
}

export interface Palette {
  id: string;
  name: string;
  colors: Color[];
}

// Default palettes
export const DEFAULT_PALETTES: Palette[] = [
  {
    id: 'gameboy',
    name: 'Game Boy',
    colors: [
      { r: 15, g: 56, b: 15, a: 255 },
      { r: 48, g: 98, b: 48, a: 255 },
      { r: 139, g: 172, b: 15, a: 255 },
      { r: 155, g: 188, b: 15, a: 255 },
    ],
  },
  {
    id: 'nes',
    name: 'NES',
    colors: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 252, g: 252, b: 252, a: 255 },
      { r: 248, g: 56, b: 0, a: 255 },
      { r: 0, g: 168, b: 0, a: 255 },
      { r: 0, g: 88, b: 248, a: 255 },
      { r: 248, g: 184, b: 0, a: 255 },
      { r: 168, g: 0, b: 198, a: 255 },
      { r: 0, g: 168, b: 248, a: 255 },
    ],
  },
  {
    id: 'pico8',
    name: 'PICO-8',
    colors: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 29, g: 43, b: 83, a: 255 },
      { r: 126, g: 37, b: 83, a: 255 },
      { r: 0, g: 135, b: 81, a: 255 },
      { r: 171, g: 82, b: 54, a: 255 },
      { r: 95, g: 87, b: 79, a: 255 },
      { r: 194, g: 195, b: 199, a: 255 },
      { r: 255, g: 241, b: 232, a: 255 },
      { r: 255, g: 0, b: 77, a: 255 },
      { r: 255, g: 163, b: 0, a: 255 },
      { r: 255, g: 236, b: 39, a: 255 },
      { r: 0, g: 228, b: 54, a: 255 },
      { r: 41, g: 173, b: 255, a: 255 },
      { r: 131, g: 118, b: 156, a: 255 },
      { r: 255, g: 119, b: 168, a: 255 },
      { r: 255, g: 204, b: 170, a: 255 },
    ],
  },
  {
    id: 'endesga32',
    name: 'ENDESGA 32',
    colors: [
      { r: 190, g: 74, b: 47, a: 255 },
      { r: 215, g: 118, b: 67, a: 255 },
      { r: 234, g: 212, b: 170, a: 255 },
      { r: 228, g: 166, b: 114, a: 255 },
      { r: 184, g: 111, b: 80, a: 255 },
      { r: 115, g: 62, b: 57, a: 255 },
      { r: 62, g: 39, b: 49, a: 255 },
      { r: 162, g: 38, b: 51, a: 255 },
      { r: 228, g: 59, b: 68, a: 255 },
      { r: 247, g: 118, b: 34, a: 255 },
      { r: 254, g: 174, b: 52, a: 255 },
      { r: 254, g: 231, b: 97, a: 255 },
      { r: 99, g: 199, b: 77, a: 255 },
      { r: 62, g: 137, b: 72, a: 255 },
      { r: 38, g: 92, b: 66, a: 255 },
      { r: 25, g: 60, b: 62, a: 255 },
      { r: 18, g: 78, b: 137, a: 255 },
      { r: 0, g: 153, b: 219, a: 255 },
      { r: 44, g: 232, b: 245, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 192, g: 203, b: 220, a: 255 },
      { r: 139, g: 155, b: 180, a: 255 },
      { r: 90, g: 105, b: 136, a: 255 },
      { r: 58, g: 68, b: 102, a: 255 },
      { r: 38, g: 43, b: 68, a: 255 },
      { r: 24, g: 20, b: 37, a: 255 },
      { r: 104, g: 56, b: 108, a: 255 },
      { r: 181, g: 80, b: 136, a: 255 },
      { r: 246, g: 117, b: 122, a: 255 },
      { r: 232, g: 183, b: 150, a: 255 },
      { r: 194, g: 133, b: 105, a: 255 },
      { r: 140, g: 90, b: 83, a: 255 },
    ],
  },
];

// Helper functions
export function colorToHex(color: Color): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 255,
  };
}

export function colorToRgba(color: Color): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
}

export function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function createEmptyLayer(width: number, height: number, name: string): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    pixels: new Uint8ClampedArray(width * height * 4),
  };
}

export function createEmptyFrame(width: number, height: number): Frame {
  return {
    id: crypto.randomUUID(),
    layers: [createEmptyLayer(width, height, 'Layer 1')],
    duration: 100,
  };
}

export function createInitialState(width: number, height: number): CanvasState {
  return {
    width,
    height,
    frames: [createEmptyFrame(width, height)],
    currentFrameIndex: 0,
    currentLayerIndex: 0,
    zoom: 8,
    gridVisible: true,
    tool: 'pencil',
    primaryColor: { r: 0, g: 0, b: 0, a: 255 },
    secondaryColor: { r: 255, g: 255, b: 255, a: 255 },
    brushSize: 1,
    selection: null,
    onionSkin: {
      enabled: false,
      framesBefore: 2,
      framesAfter: 1,
      opacityBefore: 0.3,
      opacityAfter: 0.2,
      tintBefore: { r: 255, g: 0, b: 0, a: 255 },
      tintAfter: { r: 0, g: 128, b: 255, a: 255 },
    },
  };
}
