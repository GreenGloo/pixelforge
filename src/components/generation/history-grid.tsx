'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Generation {
  id: string;
  prompt: string;
  style: string;
  imageUrl: string;
  thumbnailUrl?: string;
  pixelSize: number;
  createdAt: string;
}

interface HistoryGridProps {
  initialGenerations?: Generation[];
}

export function HistoryGrid({ initialGenerations = [] }: HistoryGridProps) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [isLoading, setIsLoading] = useState(!initialGenerations.length);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchGenerations = async (cursorId?: string) => {
    try {
      const params = new URLSearchParams();
      if (cursorId) params.set('cursor', cursorId);
      params.set('limit', '20');

      const response = await fetch(`/api/generate?${params}`);
      const data = await response.json();

      if (cursorId) {
        setGenerations((prev) => [...prev, ...data.generations]);
      } else {
        setGenerations(data.generations);
      }

      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialGenerations.length) {
      fetchGenerations();
    }
  }, []);

  const handleDownload = (generation: Generation) => {
    const link = document.createElement('a');
    link.href = generation.imageUrl;
    link.download = `pixelforge-${generation.id}.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-2">
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="h-4 mt-2 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12" />
          <div>
            <h3 className="font-semibold text-lg">No generations yet</h3>
            <p className="text-sm">Create your first pixel art to see it here</p>
          </div>
          <Button asChild>
            <a href="/generate">Generate Now</a>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {generations.map((gen) => (
          <Card key={gen.id} className="group overflow-hidden">
            <CardContent className="p-2">
              {/* Image */}
              <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <img
                  src={gen.thumbnailUrl || gen.imageUrl}
                  alt={gen.prompt}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(gen)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground truncate" title={gen.prompt}>
                  {gen.prompt}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {gen.style.toLowerCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {gen.pixelSize}x{gen.pixelSize}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => cursor && fetchGenerations(cursor)}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
