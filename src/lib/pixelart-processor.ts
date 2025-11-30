// ==========================================
// Pixel Art Post-Processing Utilities
// Convert high-res AI images to true pixel art
// ==========================================

import { DEFAULT_PALETTES, Color, Palette } from '@/lib/canvas/types';

/**
 * Downscale an image to pixel art size using nearest-neighbor
 */
export function downscaleToPixelArt(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const sourceWidth = imageData.width;
  const sourceHeight = imageData.height;
  const result = new ImageData(targetWidth, targetHeight);

  const xRatio = sourceWidth / targetWidth;
  const yRatio = sourceHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Sample from the center of the source pixel region
      const srcX = Math.floor(x * xRatio + xRatio / 2);
      const srcY = Math.floor(y * yRatio + yRatio / 2);

      const srcIdx = (srcY * sourceWidth + srcX) * 4;
      const destIdx = (y * targetWidth + x) * 4;

      result.data[destIdx] = imageData.data[srcIdx];
      result.data[destIdx + 1] = imageData.data[srcIdx + 1];
      result.data[destIdx + 2] = imageData.data[srcIdx + 2];
      result.data[destIdx + 3] = imageData.data[srcIdx + 3];
    }
  }

  return result;
}

/**
 * Calculate color distance (Euclidean in RGB space)
 */
function colorDistance(c1: Color, c2: Color): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Find the nearest color in a palette
 */
function findNearestColor(color: Color, palette: Color[]): Color {
  let nearest = palette[0];
  let minDist = Infinity;

  for (const paletteColor of palette) {
    const dist = colorDistance(color, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      nearest = paletteColor;
    }
  }

  return nearest;
}

/**
 * Quantize image colors to a palette
 */
export function quantizeToPalette(imageData: ImageData, palette: Palette): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < result.data.length; i += 4) {
    // Skip fully transparent pixels
    if (result.data[i + 3] < 128) {
      result.data[i] = 0;
      result.data[i + 1] = 0;
      result.data[i + 2] = 0;
      result.data[i + 3] = 0;
      continue;
    }

    const color: Color = {
      r: result.data[i],
      g: result.data[i + 1],
      b: result.data[i + 2],
      a: 255,
    };

    const nearest = findNearestColor(color, palette.colors);

    result.data[i] = nearest.r;
    result.data[i + 1] = nearest.g;
    result.data[i + 2] = nearest.b;
    result.data[i + 3] = 255;
  }

  return result;
}

/**
 * Extract unique colors from an image (up to maxColors)
 */
export function extractColors(imageData: ImageData, maxColors: number = 16): Color[] {
  const colorCounts = new Map<string, { color: Color; count: number }>();

  for (let i = 0; i < imageData.data.length; i += 4) {
    // Skip transparent pixels
    if (imageData.data[i + 3] < 128) continue;

    const key = `${imageData.data[i]},${imageData.data[i + 1]},${imageData.data[i + 2]}`;

    if (colorCounts.has(key)) {
      colorCounts.get(key)!.count++;
    } else {
      colorCounts.set(key, {
        color: {
          r: imageData.data[i],
          g: imageData.data[i + 1],
          b: imageData.data[i + 2],
          a: 255,
        },
        count: 1,
      });
    }
  }

  // Sort by count and take top maxColors
  const sorted = Array.from(colorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((entry) => entry.color);

  return sorted;
}

/**
 * Reduce colors using median cut algorithm
 */
export function reduceColors(imageData: ImageData, targetColors: number): ImageData {
  // Extract all unique colors
  const colors = extractColors(imageData, 256);

  if (colors.length <= targetColors) {
    return imageData; // Already within limit
  }

  // Simple color reduction: cluster colors and use cluster centers
  // This is a simplified version - a full implementation would use median cut or k-means

  // For now, quantize to one of the default palettes that's closest in size
  let bestPalette = DEFAULT_PALETTES[0];
  let bestDiff = Math.abs(bestPalette.colors.length - targetColors);

  for (const palette of DEFAULT_PALETTES) {
    const diff = Math.abs(palette.colors.length - targetColors);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestPalette = palette;
    }
  }

  return quantizeToPalette(imageData, bestPalette);
}

/**
 * Apply posterization effect (reduce color depth per channel)
 */
export function posterize(imageData: ImageData, levels: number): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const step = 255 / (levels - 1);

  for (let i = 0; i < result.data.length; i += 4) {
    if (result.data[i + 3] < 128) continue;

    result.data[i] = Math.round(Math.round(result.data[i] / step) * step);
    result.data[i + 1] = Math.round(Math.round(result.data[i + 1] / step) * step);
    result.data[i + 2] = Math.round(Math.round(result.data[i + 2] / step) * step);
  }

  return result;
}

/**
 * Remove anti-aliasing by posterizing alpha and thresholding
 */
export function removeAntiAliasing(imageData: ImageData, threshold: number = 128): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < result.data.length; i += 4) {
    // Hard alpha threshold
    result.data[i + 3] = result.data[i + 3] >= threshold ? 255 : 0;
  }

  return result;
}

/**
 * Full pixel art conversion pipeline
 */
export interface PixelArtOptions {
  targetWidth: number;
  targetHeight: number;
  palette?: Palette;
  colorLevels?: number;
  removeAA?: boolean;
  aaThreshold?: number;
}

export function convertToPixelArt(
  imageData: ImageData,
  options: PixelArtOptions
): ImageData {
  let result = imageData;

  // 1. Downscale to target size
  result = downscaleToPixelArt(result, options.targetWidth, options.targetHeight);

  // 2. Remove anti-aliasing if requested
  if (options.removeAA) {
    result = removeAntiAliasing(result, options.aaThreshold ?? 128);
  }

  // 3. Reduce colors - either to palette or by posterization
  if (options.palette) {
    result = quantizeToPalette(result, options.palette);
  } else if (options.colorLevels) {
    result = posterize(result, options.colorLevels);
  }

  return result;
}

/**
 * Load an image URL and get its ImageData
 */
export async function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };

    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Convert ImageData to a data URL
 */
export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
