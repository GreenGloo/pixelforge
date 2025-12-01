'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { useSkeletonStore } from '@/lib/skeleton/useSkeletonStore';
import { Color } from '@/lib/canvas/types';
import { getBoneWorldPosition } from '@/lib/skeleton/types';

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  // For shape tools - track start position
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
  // For move tool - track drag offset
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(null);
  // For IK target dragging
  const [draggingIKChainId, setDraggingIKChainId] = useState<string | null>(null);
  // For bone dragging
  const [draggingBoneId, setDraggingBoneId] = useState<string | null>(null);
  const [boneDragStart, setBoneDragStart] = useState<{ x: number; y: number } | null>(null);

  // Get skeleton state from skeleton store
  const {
    bones,
    showBones,
    ikChains,
    ikEnabled,
    updateIKTarget,
    setActiveIKChain,
    selectedBoneId,
    selectBone,
    moveBone,
    // Sprite deformation
    spriteParts,
    currentTransforms,
    animationEnabled,
  } = useSkeletonStore();

  const {
    width,
    height,
    zoom,
    gridVisible,
    tool,
    primaryColor,
    secondaryColor,
    brushSize,
    brushShape,
    shapeFilled,
    frames,
    currentFrameIndex,
    currentLayerIndex,
    onionSkin,
    maskData,
    showMask,
    maskTool,
    maskBrushSize,
    selection,
    setPixels,
    fillArea,
    setPrimaryColor,
    pushHistory,
    commitHistory,
    setMaskPixels,
    setSelection,
    copySelection,
    pasteSelection,
    getCompositePixelColor,
  } = useCanvasStore();

  const frame = frames[currentFrameIndex];

  // Get pixels in a line (Bresenham's algorithm) - MUST be defined before render
  const getLinePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const pixels: { x: number; y: number }[] = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      let x = x0;
      let y = y0;
      const radius = brushSize / 2;

      while (true) {
        // Add brush size with shape support
        for (let by = -Math.floor(brushSize / 2); by < Math.ceil(brushSize / 2); by++) {
          for (let bx = -Math.floor(brushSize / 2); bx < Math.ceil(brushSize / 2); bx++) {
            // For circular brush, check if within radius
            if (brushShape === 'circle' && brushSize > 1) {
              const dist = Math.sqrt(bx * bx + by * by);
              if (dist > radius) continue;
            }
            const px = x + bx;
            const py = y + by;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              pixels.push({ x: px, y: py });
            }
          }
        }

        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }

      return pixels;
    },
    [brushSize, brushShape, width, height]
  );

  // Get pixels for mask line using maskBrushSize
  const getMaskLinePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const pixels: { x: number; y: number }[] = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      let x = x0;
      let y = y0;

      while (true) {
        // Add mask brush size
        for (let by = -Math.floor(maskBrushSize / 2); by < Math.ceil(maskBrushSize / 2); by++) {
          for (let bx = -Math.floor(maskBrushSize / 2); bx < Math.ceil(maskBrushSize / 2); bx++) {
            const px = x + bx;
            const py = y + by;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              pixels.push({ x: px, y: py });
            }
          }
        }

        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }

      return pixels;
    },
    [maskBrushSize, width, height]
  );

  // Get pixels for a rectangle outline - MUST be defined before render
  const getRectanglePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number, filled: boolean = false) => {
      const pixels: { x: number; y: number }[] = [];
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);

      if (filled) {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
              pixels.push({ x, y });
            }
          }
        }
      } else {
        // Top and bottom edges
        for (let x = minX; x <= maxX; x++) {
          if (x >= 0 && x < width) {
            if (minY >= 0 && minY < height) pixels.push({ x, y: minY });
            if (maxY >= 0 && maxY < height && maxY !== minY) pixels.push({ x, y: maxY });
          }
        }
        // Left and right edges (excluding corners)
        for (let y = minY + 1; y < maxY; y++) {
          if (y >= 0 && y < height) {
            if (minX >= 0 && minX < width) pixels.push({ x: minX, y });
            if (maxX >= 0 && maxX < width && maxX !== minX) pixels.push({ x: maxX, y });
          }
        }
      }
      return pixels;
    },
    [width, height]
  );

  // Get pixels for an ellipse using midpoint algorithm - MUST be defined before render
  const getEllipsePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number, filled: boolean = false) => {
      const pixels: { x: number; y: number }[] = [];
      const cx = Math.round((x0 + x1) / 2);
      const cy = Math.round((y0 + y1) / 2);
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;

      if (rx === 0 || ry === 0) {
        // Degenerate case - draw a line
        return getLinePixels(x0, y0, x1, y1);
      }

      const addPixel = (x: number, y: number) => {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          pixels.push({ x, y });
        }
      };

      if (filled) {
        // Filled ellipse - scan line approach
        for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
          const xWidth = rx * Math.sqrt(1 - (y * y) / (ry * ry));
          for (let x = -Math.ceil(xWidth); x <= Math.ceil(xWidth); x++) {
            addPixel(cx + x, cy + y);
          }
        }
      } else {
        // Outline ellipse - midpoint algorithm
        let x = 0;
        let y = Math.round(ry);
        const rx2 = rx * rx;
        const ry2 = ry * ry;

        // Region 1
        let p1 = ry2 - rx2 * ry + 0.25 * rx2;
        while (2 * ry2 * x <= 2 * rx2 * y) {
          addPixel(cx + x, cy + y);
          addPixel(cx - x, cy + y);
          addPixel(cx + x, cy - y);
          addPixel(cx - x, cy - y);

          x++;
          if (p1 < 0) {
            p1 += 2 * ry2 * x + ry2;
          } else {
            y--;
            p1 += 2 * ry2 * x - 2 * rx2 * y + ry2;
          }
        }

        // Region 2
        let p2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
        while (y >= 0) {
          addPixel(cx + x, cy + y);
          addPixel(cx - x, cy + y);
          addPixel(cx + x, cy - y);
          addPixel(cx - x, cy - y);

          y--;
          if (p2 > 0) {
            p2 += rx2 - 2 * rx2 * y;
          } else {
            x++;
            p2 += 2 * ry2 * x - 2 * rx2 * y + rx2;
          }
        }
      }

      return pixels;
    },
    [width, height, getLinePixels]
  );

  // Helper to render a frame with optional tint
  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, frameToRender: typeof frame, opacity: number, tint?: Color) => {
      if (!frameToRender) return;

      for (const l of frameToRender.layers) {
        if (!l.visible) continue;

        ctx.globalAlpha = l.opacity * opacity;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = l.pixels[idx + 3];
            if (a === 0) continue;

            let r = l.pixels[idx];
            let g = l.pixels[idx + 1];
            let b = l.pixels[idx + 2];

            // Apply tint if provided
            if (tint) {
              r = Math.round(r * 0.5 + tint.r * 0.5);
              g = Math.round(g * 0.5 + tint.g * 0.5);
              b = Math.round(b * 0.5 + tint.b * 0.5);
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }

        ctx.globalAlpha = 1;
      }
    },
    [width, height, zoom]
  );

  // Render frame with bone deformation applied to sprite parts
  const renderDeformedFrame = useCallback(
    (ctx: CanvasRenderingContext2D, frameToRender: typeof frame, opacity: number) => {
      if (!frameToRender || spriteParts.length === 0 || bones.length === 0) {
        renderFrame(ctx, frameToRender, opacity);
        return;
      }

      // Create a temporary canvas to extract sprite part pixels
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;

      // Draw all layers to temp canvas
      for (const l of frameToRender.layers) {
        if (!l.visible) continue;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = l.pixels[idx + 3];
            if (a === 0) continue;
            const r = l.pixels[idx];
            const g = l.pixels[idx + 1];
            const b = l.pixels[idx + 2];
            tempCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(a / 255) * l.opacity})`;
            tempCtx.fillRect(x, y, 1, 1);
          }
        }
      }

      // Track which pixels have been rendered by sprite parts
      const renderedPixels = new Set<string>();

      // Render each sprite part with its bone transform
      for (const part of spriteParts) {
        const bone = bones.find(b => b.id === part.boneId);
        if (!bone) continue;

        const transform = currentTransforms[part.boneId];
        if (!transform) continue;

        // Get bone world position for transform origin
        const bonePos = getBoneWorldPosition(bone, bones);

        // Calculate pivot point in world coordinates
        const pivotX = part.x + part.width * part.pivotX;
        const pivotY = part.y + part.height * part.pivotY;

        // Apply transform
        ctx.save();
        ctx.globalAlpha = opacity;

        // Move to bone position, apply rotation, then offset
        const rotationRad = (transform.rotation * Math.PI) / 180;

        // For each pixel in this sprite part
        for (let py = part.y; py < part.y + part.height; py++) {
          for (let px = part.x; px < part.x + part.width; px++) {
            if (px < 0 || px >= width || py < 0 || py >= height) continue;

            // Get pixel color from temp canvas
            const pixelData = tempCtx.getImageData(px, py, 1, 1).data;
            if (pixelData[3] === 0) continue; // Skip transparent

            // Mark as rendered
            renderedPixels.add(`${px},${py}`);

            // Calculate position relative to pivot
            const relX = px - pivotX;
            const relY = py - pivotY;

            // Apply rotation around pivot
            const rotatedX = relX * Math.cos(rotationRad) - relY * Math.sin(rotationRad);
            const rotatedY = relX * Math.sin(rotationRad) + relY * Math.cos(rotationRad);

            // Add back pivot and apply translation
            const finalX = rotatedX + pivotX + transform.x;
            const finalY = rotatedY + pivotY + transform.y;

            // Draw pixel at transformed position
            ctx.fillStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
            ctx.fillRect(finalX * zoom, finalY * zoom, zoom, zoom);
          }
        }

        ctx.restore();
      }

      // Render any pixels not covered by sprite parts normally
      ctx.globalAlpha = opacity;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (renderedPixels.has(`${x},${y}`)) continue;

          const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
          if (pixelData[3] === 0) continue;

          ctx.fillStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
      ctx.globalAlpha = 1;
    },
    [width, height, zoom, spriteParts, bones, currentTransforms, renderFrame]
  );

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = width * zoom;
    const displayHeight = height * zoom;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw checkerboard background for transparency
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2a3e' : '#252538';
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    // Draw onion skin frames BEFORE current frame
    if (onionSkin.enabled && frames.length > 1) {
      // Previous frames (red tint)
      for (let i = 1; i <= onionSkin.framesBefore; i++) {
        const frameIndex = currentFrameIndex - i;
        if (frameIndex >= 0) {
          const opacity = onionSkin.opacityBefore * (1 - (i - 1) / onionSkin.framesBefore);
          renderFrame(ctx, frames[frameIndex], opacity, onionSkin.tintBefore);
        }
      }

      // Next frames (blue tint)
      for (let i = 1; i <= onionSkin.framesAfter; i++) {
        const frameIndex = currentFrameIndex + i;
        if (frameIndex < frames.length) {
          const opacity = onionSkin.opacityAfter * (1 - (i - 1) / onionSkin.framesAfter);
          renderFrame(ctx, frames[frameIndex], opacity, onionSkin.tintAfter);
        }
      }
    }

    // Draw current frame layers (bottom to top)
    // Use deformed rendering only when actively animating with non-default transforms
    const hasNonDefaultTransforms = Object.values(currentTransforms).some(
      t => t.rotation !== 0 || t.x !== 0 || t.y !== 0
    );

    if (animationEnabled && spriteParts.length > 0 && hasNonDefaultTransforms) {
      renderDeformedFrame(ctx, frame, 1);
    } else {
      renderFrame(ctx, frame, 1);
    }

    // Draw grid
    if (gridVisible && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * zoom + 0.5, 0);
        ctx.lineTo(x * zoom + 0.5, displayHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom + 0.5);
        ctx.lineTo(displayWidth, y * zoom + 0.5);
        ctx.stroke();
      }
    }

    // Draw mask overlay
    if (maskData && (showMask || tool === 'mask')) {
      ctx.globalAlpha = 0.5;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const maskValue = maskData[y * width + x];
          if (maskValue > 0) {
            // Pink/magenta overlay for masked areas
            ctx.fillStyle = 'rgba(255, 0, 128, 0.6)';
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw shape preview while dragging
    if (shapeStart && shapeEnd && (tool === 'line' || tool === 'rectangle' || tool === 'ellipse')) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.8)`;

      let previewPixels: { x: number; y: number }[] = [];

      if (tool === 'line') {
        previewPixels = getLinePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === 'rectangle') {
        previewPixels = getRectanglePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, shapeFilled);
      } else if (tool === 'ellipse') {
        previewPixels = getEllipsePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, shapeFilled);
      }

      for (const { x, y } of previewPixels) {
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
      ctx.globalAlpha = 1;
    }

    // Draw selection preview while dragging select tool
    if (shapeStart && shapeEnd && tool === 'select') {
      const minX = Math.min(shapeStart.x, shapeEnd.x);
      const maxX = Math.max(shapeStart.x, shapeEnd.x);
      const minY = Math.min(shapeStart.y, shapeEnd.y);
      const maxY = Math.max(shapeStart.y, shapeEnd.y);

      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX * zoom, minY * zoom, (maxX - minX + 1) * zoom, (maxY - minY + 1) * zoom);
      ctx.setLineDash([]);
    }

    // Draw active selection
    if (selection) {
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(selection.x * zoom, selection.y * zoom, selection.width * zoom, selection.height * zoom);
      ctx.setLineDash([]);

      // Fill selection with subtle highlight
      ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
      ctx.fillRect(selection.x * zoom, selection.y * zoom, selection.width * zoom, selection.height * zoom);
    }

    // Draw skeleton bones when visible
    if (showBones && bones.length > 0) {
      const JOINT_RADIUS = Math.max(3, zoom * 0.4);
      const boneMap = new Map(bones.map(b => [b.id, b]));

      // Draw bones (lines connecting joints)
      for (const bone of bones) {
        if (!bone.parentId) continue;

        const parent = boneMap.get(bone.parentId);
        if (!parent) continue;

        // Get world positions
        const bonePos = getBoneWorldPosition(bone, bones);
        const parentPos = getBoneWorldPosition(parent, bones);

        const startX = parentPos.x * zoom;
        const startY = parentPos.y * zoom;
        const endX = bonePos.x * zoom;
        const endY = bonePos.y * zoom;

        // Draw bone line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);

        // Use bone color with transparency
        const isSelected = bone.id === selectedBoneId;
        if (isSelected) {
          ctx.strokeStyle = 'rgba(255, 255, 100, 0.9)';
        } else {
          // Convert hex color to rgba
          const hex = bone.color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
      }

      // Draw joints (circles at bone positions)
      for (const bone of bones) {
        const pos = getBoneWorldPosition(bone, bones);
        const screenX = pos.x * zoom;
        const screenY = pos.y * zoom;

        const isSelected = bone.id === selectedBoneId;
        const isRoot = !bone.parentId;

        ctx.beginPath();
        ctx.arc(screenX, screenY, isRoot ? JOINT_RADIUS * 1.5 : JOINT_RADIUS, 0, Math.PI * 2);

        // Root bone is larger, selected bone is highlighted
        if (isSelected) {
          ctx.fillStyle = 'rgba(255, 255, 100, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
          ctx.lineWidth = 2;
        } else if (isRoot) {
          ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
        } else {
          ctx.fillStyle = bone.color;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;
        }

        ctx.fill();
        ctx.stroke();

        // Draw bone name for root and selected bones
        if (isRoot || isSelected) {
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(bone.name, screenX, screenY - JOINT_RADIUS - 4);
        }
      }
    }

    // Draw IK targets when IK is enabled
    if (ikEnabled && ikChains.length > 0) {
      const IK_TARGET_RADIUS = Math.max(4, zoom * 0.5);

      for (const chain of ikChains) {
        if (!chain.enabled) continue;

        const screenX = chain.targetX * zoom;
        const screenY = chain.targetY * zoom;

        // Draw target circle
        ctx.beginPath();
        ctx.arc(screenX, screenY, IK_TARGET_RADIUS, 0, Math.PI * 2);

        // Different color for active/dragging chain
        if (draggingIKChainId === chain.id) {
          ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        } else {
          ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        }

        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw crosshair
        ctx.beginPath();
        ctx.moveTo(screenX - IK_TARGET_RADIUS - 2, screenY);
        ctx.lineTo(screenX + IK_TARGET_RADIUS + 2, screenY);
        ctx.moveTo(screenX, screenY - IK_TARGET_RADIUS - 2);
        ctx.lineTo(screenX, screenY + IK_TARGET_RADIUS + 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw chain name label
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(chain.name, screenX, screenY - IK_TARGET_RADIUS - 6);
      }
    }
  }, [frame, frames, currentFrameIndex, width, height, zoom, gridVisible, onionSkin, renderFrame, renderDeformedFrame, maskData, showMask, tool, shapeStart, shapeEnd, primaryColor, shapeFilled, getLinePixels, getRectanglePixels, getEllipsePixels, selection, ikEnabled, ikChains, draggingIKChainId, showBones, bones, selectedBoneId, animationEnabled, spriteParts, currentTransforms]);

  useEffect(() => {
    render();
  }, [render, frames, currentFrameIndex, currentLayerIndex, maskData, shapeStart, shapeEnd, selection, ikChains, ikEnabled, bones, showBones, selectedBoneId, currentTransforms, spriteParts, animationEnabled]);

  // Get pixel coordinates from mouse event
  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / zoom);
      const y = Math.floor((e.clientY - rect.top) / zoom);

      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return { x, y };
    },
    [zoom, width, height]
  );

  // Get raw canvas coordinates (not pixel-snapped) for IK dragging
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      return { x, y };
    },
    [zoom]
  );

  // Check if a click hits an IK target
  const getIKTargetAtPosition = useCallback(
    (x: number, y: number): string | null => {
      if (!ikEnabled) return null;

      const IK_HIT_RADIUS = Math.max(6, zoom * 0.6) / zoom; // Convert to pixel space

      for (const chain of ikChains) {
        if (!chain.enabled) continue;

        const dx = x - chain.targetX;
        const dy = y - chain.targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= IK_HIT_RADIUS) {
          return chain.id;
        }
      }
      return null;
    },
    [ikEnabled, ikChains, zoom]
  );

  // Check if a click hits a bone joint
  const getBoneAtPosition = useCallback(
    (x: number, y: number): string | null => {
      if (!showBones || bones.length === 0) return null;

      const BONE_HIT_RADIUS = Math.max(5, zoom * 0.5) / zoom; // Convert to pixel space

      // Check bones in reverse order (later bones on top)
      for (let i = bones.length - 1; i >= 0; i--) {
        const bone = bones[i];
        const pos = getBoneWorldPosition(bone, bones);

        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= BONE_HIT_RADIUS) {
          return bone.id;
        }
      }
      return null;
    },
    [showBones, bones, zoom]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvasCoords = getCanvasCoords(e);

      // Check for IK target click first (when IK is enabled)
      if (ikEnabled && canvasCoords) {
        const ikChainId = getIKTargetAtPosition(canvasCoords.x, canvasCoords.y);
        if (ikChainId) {
          setDraggingIKChainId(ikChainId);
          setActiveIKChain(ikChainId);
          return; // Don't process as regular drawing
        }
      }

      // Check for bone click (when bones are visible)
      if (showBones && canvasCoords) {
        const boneId = getBoneAtPosition(canvasCoords.x, canvasCoords.y);
        if (boneId) {
          selectBone(boneId);
          setDraggingBoneId(boneId);
          // Store the bone's current position for delta calculation
          const bone = bones.find(b => b.id === boneId);
          if (bone) {
            setBoneDragStart({ x: bone.x, y: bone.y });
          }
          return; // Don't process as regular drawing
        }
      }

      const coords = getPixelCoords(e);
      if (!coords) return;

      const color = e.button === 2 ? secondaryColor : primaryColor;

      // Don't push history for non-drawing tools
      if (!['eyedropper', 'select'].includes(tool)) {
        pushHistory();
      }
      setIsDrawing(true);
      setLastPos(coords);

      switch (tool) {
        case 'pencil':
          const pixels = getLinePixels(coords.x, coords.y, coords.x, coords.y);
          setPixels(pixels.map((p) => ({ ...p, color })));
          break;
        case 'eraser':
          const eraserPixels = getLinePixels(coords.x, coords.y, coords.x, coords.y);
          setPixels(eraserPixels.map((p) => ({ ...p, color: { r: 0, g: 0, b: 0, a: 0 } })));
          break;
        case 'bucket':
          fillArea(coords.x, coords.y, color);
          break;
        case 'eyedropper':
          // Use composite color picker (samples all visible layers)
          const pickedColor = getCompositePixelColor(coords.x, coords.y);
          if (pickedColor && pickedColor.a > 0) {
            setPrimaryColor(pickedColor);
          }
          break;
        case 'select':
          // Start rectangle selection
          setSelection(null);
          setShapeStart(coords);
          setShapeEnd(coords);
          break;
        case 'move':
          // Start moving selection or all content
          if (selection) {
            // Check if clicking inside selection
            if (
              coords.x >= selection.x &&
              coords.x < selection.x + selection.width &&
              coords.y >= selection.y &&
              coords.y < selection.y + selection.height
            ) {
              setMoveOffset({ x: coords.x - selection.x, y: coords.y - selection.y });
              copySelection();
            }
          }
          break;
        case 'mask':
          // Use maskTool from store (brush adds, eraser removes)
          const maskValue = maskTool === 'eraser' ? 0 : 255;
          const maskPixels = getMaskLinePixels(coords.x, coords.y, coords.x, coords.y);
          setMaskPixels(maskPixels.map((p) => ({ ...p, value: maskValue })));
          break;
        case 'line':
        case 'rectangle':
        case 'ellipse':
          // Start shape drawing
          setShapeStart(coords);
          setShapeEnd(coords);
          break;
      }
    },
    [
      getPixelCoords,
      getCanvasCoords,
      getIKTargetAtPosition,
      ikEnabled,
      setActiveIKChain,
      tool,
      primaryColor,
      secondaryColor,
      setPixels,
      fillArea,
      setPrimaryColor,
      getLinePixels,
      getMaskLinePixels,
      pushHistory,
      setMaskPixels,
      maskTool,
      selection,
      setSelection,
      copySelection,
      getCompositePixelColor,
      showBones,
      getBoneAtPosition,
      selectBone,
      bones,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle IK target dragging
      if (draggingIKChainId) {
        const canvasCoords = getCanvasCoords(e);
        if (canvasCoords) {
          updateIKTarget(draggingIKChainId, canvasCoords.x, canvasCoords.y);
        }
        return;
      }

      // Handle bone dragging
      if (draggingBoneId && boneDragStart) {
        const canvasCoords = getCanvasCoords(e);
        if (canvasCoords) {
          const bone = bones.find(b => b.id === draggingBoneId);
          if (bone) {
            // Calculate new position based on world coordinates
            const bonePos = getBoneWorldPosition(bone, bones);
            // Use delta from initial click position
            const deltaX = canvasCoords.x - bonePos.x;
            const deltaY = canvasCoords.y - bonePos.y;
            moveBone(draggingBoneId, bone.x + deltaX, bone.y + deltaY);
          }
        }
        return;
      }

      if (!isDrawing) return;

      const coords = getPixelCoords(e);
      if (!coords) return;

      const color = e.buttons === 2 ? secondaryColor : primaryColor;

      switch (tool) {
        case 'pencil':
          if (lastPos) {
            const pixels = getLinePixels(lastPos.x, lastPos.y, coords.x, coords.y);
            setPixels(pixels.map((p) => ({ ...p, color })));
          }
          setLastPos(coords);
          break;
        case 'eraser':
          if (lastPos) {
            const eraserPixels = getLinePixels(lastPos.x, lastPos.y, coords.x, coords.y);
            setPixels(eraserPixels.map((p) => ({ ...p, color: { r: 0, g: 0, b: 0, a: 0 } })));
          }
          setLastPos(coords);
          break;
        case 'select':
          // Update selection rectangle preview
          setShapeEnd(coords);
          break;
        case 'move':
          // Move selection preview
          if (moveOffset && selection) {
            const newX = coords.x - moveOffset.x;
            const newY = coords.y - moveOffset.y;
            setSelection({
              ...selection,
              x: newX,
              y: newY,
            });
          }
          break;
        case 'mask':
          if (lastPos) {
            // Use maskTool from store (brush adds, eraser removes)
            const maskMoveValue = maskTool === 'eraser' ? 0 : 255;
            const maskMovePixels = getMaskLinePixels(lastPos.x, lastPos.y, coords.x, coords.y);
            setMaskPixels(maskMovePixels.map((p) => ({ ...p, value: maskMoveValue })));
          }
          setLastPos(coords);
          break;
        case 'line':
        case 'rectangle':
        case 'ellipse':
          // Update shape preview end point
          setShapeEnd(coords);
          break;
      }
    },
    [isDrawing, lastPos, getPixelCoords, getCanvasCoords, draggingIKChainId, updateIKTarget, draggingBoneId, boneDragStart, bones, moveBone, tool, primaryColor, secondaryColor, setPixels, getLinePixels, getMaskLinePixels, setMaskPixels, maskTool, moveOffset, selection, setSelection]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Stop IK target dragging
    if (draggingIKChainId) {
      setDraggingIKChainId(null);
      return;
    }

    // Stop bone dragging
    if (draggingBoneId) {
      setDraggingBoneId(null);
      setBoneDragStart(null);
      return;
    }

    // Handle select tool - finalize selection
    if (tool === 'select' && shapeStart && shapeEnd) {
      const minX = Math.min(shapeStart.x, shapeEnd.x);
      const maxX = Math.max(shapeStart.x, shapeEnd.x);
      const minY = Math.min(shapeStart.y, shapeEnd.y);
      const maxY = Math.max(shapeStart.y, shapeEnd.y);
      const selWidth = maxX - minX + 1;
      const selHeight = maxY - minY + 1;

      if (selWidth > 0 && selHeight > 0) {
        setSelection({ x: minX, y: minY, width: selWidth, height: selHeight });
      }
    }

    // Handle move tool - paste selection at new location
    if (tool === 'move' && moveOffset && selection) {
      pasteSelection(selection.x, selection.y);
      commitHistory();
    }

    // Commit shapes on mouse up
    if (shapeStart && shapeEnd && (tool === 'line' || tool === 'rectangle' || tool === 'ellipse')) {
      let shapePixels: { x: number; y: number }[] = [];

      if (tool === 'line') {
        shapePixels = getLinePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === 'rectangle') {
        shapePixels = getRectanglePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, shapeFilled);
      } else if (tool === 'ellipse') {
        shapePixels = getEllipsePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, shapeFilled);
      }

      if (shapePixels.length > 0) {
        setPixels(shapePixels.map((p) => ({ ...p, color: primaryColor })));
      }
    }

    // Commit history for drawing tools
    if (['pencil', 'eraser', 'bucket', 'line', 'rectangle', 'ellipse', 'mask'].includes(tool)) {
      commitHistory();
    }

    setIsDrawing(false);
    setLastPos(null);
    setShapeStart(null);
    setShapeEnd(null);
    setMoveOffset(null);
  }, [draggingIKChainId, draggingBoneId, tool, shapeStart, shapeEnd, primaryColor, shapeFilled, getLinePixels, getRectanglePixels, getEllipsePixels, setPixels, setSelection, moveOffset, selection, pasteSelection, commitHistory]);

  // Handle mouse leave - don't stop drawing for continuous tools
  const handleMouseLeave = useCallback(() => {
    // Stop IK dragging on leave
    if (draggingIKChainId) {
      setDraggingIKChainId(null);
    }
    // Stop bone dragging on leave
    if (draggingBoneId) {
      setDraggingBoneId(null);
      setBoneDragStart(null);
    }
    // For shape tools, reset the preview but keep drawing state
    // For continuous tools (pencil, eraser, mask), keep drawing state
    // so user can continue when mouse re-enters
    if (['line', 'rectangle', 'ellipse', 'select'].includes(tool)) {
      setShapeStart(null);
      setShapeEnd(null);
      setIsDrawing(false);
    }
    if (tool === 'move') {
      setMoveOffset(null);
      setIsDrawing(false);
    }
    // For pencil, eraser, mask - keep isDrawing true, just clear lastPos
    // so the next stroke starts fresh when mouse re-enters
    setLastPos(null);
  }, [draggingIKChainId, draggingBoneId, tool]);

  // Global mouseup listener to stop drawing when mouse released outside canvas
  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMouseUp = () => {
      // Commit history for drawing tools
      if (['pencil', 'eraser', 'bucket', 'line', 'rectangle', 'ellipse', 'mask'].includes(tool)) {
        commitHistory();
      }
      setIsDrawing(false);
      setLastPos(null);
      setShapeStart(null);
      setShapeEnd(null);
      setMoveOffset(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDrawing, tool, commitHistory]);

  // Global mouseup listener for bone dragging
  useEffect(() => {
    if (!draggingBoneId) return;

    const handleGlobalMouseUp = () => {
      setDraggingBoneId(null);
      setBoneDragStart(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingBoneId]);

  // Global mouseup listener for IK target dragging
  useEffect(() => {
    if (!draggingIKChainId) return;

    const handleGlobalMouseUp = () => {
      setDraggingIKChainId(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingIKChainId]);

  // Prevent context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#0f0f1a] flex items-center justify-center p-4"
    >
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        style={{
          imageRendering: 'pixelated',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
