'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Color } from '@/lib/canvas/types';

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
    renderFrame(ctx, frame, 1);

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
  }, [frame, frames, currentFrameIndex, width, height, zoom, gridVisible, onionSkin, renderFrame, maskData, showMask, tool, shapeStart, shapeEnd, primaryColor, shapeFilled, getLinePixels, getRectanglePixels, getEllipsePixels, selection]);

  useEffect(() => {
    render();
  }, [render, frames, currentFrameIndex, currentLayerIndex, maskData, shapeStart, shapeEnd, selection]);

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

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    [isDrawing, lastPos, getPixelCoords, tool, primaryColor, secondaryColor, setPixels, getLinePixels, getMaskLinePixels, setMaskPixels, maskTool, moveOffset, selection, setSelection]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
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
  }, [tool, shapeStart, shapeEnd, primaryColor, shapeFilled, getLinePixels, getRectanglePixels, getEllipsePixels, setPixels, setSelection, moveOffset, selection, pasteSelection, commitHistory]);

  // Handle mouse leave - don't stop drawing for continuous tools
  const handleMouseLeave = useCallback(() => {
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
  }, [tool]);

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
