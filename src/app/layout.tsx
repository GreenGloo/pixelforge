import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PixelForge - AI Pixel Art Generator',
  description: 'Create stunning pixel art with AI. Generate characters, items, scenes, and tilesets for your games.',
  keywords: ['pixel art', 'AI art', 'game assets', 'sprite generator', 'indie game'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
