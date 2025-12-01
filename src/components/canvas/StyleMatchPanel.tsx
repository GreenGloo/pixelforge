'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCanvasStore } from '@/lib/canvas/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Palette,
  Upload,
  X,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

export function StyleMatchPanel() {
  const { data: session } = useSession();
  const { width, height, loadFromUrl } = useCanvasStore();

  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState(0.7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveReference = useCallback(() => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleGenerate = async () => {
    if (!session?.user) {
      setError('Please sign in to generate');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewUrl(null);

    try {
      const response = await fetch('/api/style-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          referenceImageUrl: referenceImage,
          styleStrength,
          width,
          height,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      setPreviewUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToCanvas = async () => {
    if (!previewUrl) return;
    await loadFromUrl(previewUrl);
    setPreviewUrl(null);
  };

  // Credit cost: 2 with reference image, 1 without (matches API)
  const creditCost = referenceImage ? 2 : 1;

  return (
    <div className="bg-[#1a1a2e] border-b border-[#2a2a4e]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a4e]">
        <Palette className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-sm">Style Match</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Reference Image Upload */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Reference Style (optional)
          </label>
          {referenceImage ? (
            <div className="relative">
              <img
                src={referenceImage}
                alt="Reference"
                className="w-full h-20 object-contain bg-[#0f0f1a] rounded"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 bg-black/50"
                onClick={handleRemoveReference}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-[#2a2a4e] rounded hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-1"
            >
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-gray-500">Upload reference</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-1">
            New generations will match this style
          </p>
        </div>

        {/* Style Strength (only shown with reference) */}
        {referenceImage && (
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
              <span>Style Strength</span>
              <span>{Math.round(styleStrength * 100)}%</span>
            </label>
            <Slider
              value={[styleStrength]}
              onValueChange={([v]) => setStyleStrength(v)}
              min={0.1}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher = closer to reference style
            </p>
          </div>
        )}

        {/* Prompt */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            What to generate
          </label>
          <Textarea
            placeholder="e.g., warrior knight, sword, armor..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
            {error}
          </p>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Preview</label>
            <img
              src={previewUrl}
              alt="Generated"
              className="w-full h-32 object-contain bg-[#0f0f1a] rounded"
              style={{ imageRendering: 'pixelated' }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleApplyToCanvas}
            >
              <ImageIcon className="w-3 h-3 mr-1" /> Apply to Canvas
            </Button>
          </div>
        )}

        {/* Generate button */}
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate ({creditCost} credit{creditCost > 1 ? 's' : ''})
            </>
          )}
        </Button>

        {!session?.user && (
          <p className="text-xs text-gray-500 text-center">
            Sign in to use style matching
          </p>
        )}
      </div>
    </div>
  );
}
