import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { Sparkles, Image, History, Palette, TrendingUp } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Fetch user stats
  const [user, generationCount, recentGenerations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { credits: true, plan: true, createdAt: true },
    }),
    prisma.generation.count({
      where: { userId: session!.user.id, status: 'COMPLETED' },
    }),
    prisma.generation.findMany({
      where: { userId: session!.user.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        prompt: true,
        imageUrl: true,
        style: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name || 'Creator'}!</h1>
          <p className="text-muted-foreground">
            Ready to create some pixel art magic?
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate New
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits Available</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.credits ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mt-1">{user?.plan}</Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generationCount}</div>
            <p className="text-xs text-muted-foreground">
              Pixel art created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today'}
            </div>
            <p className="text-xs text-muted-foreground">
              Keep creating!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Quick Generate
            </CardTitle>
            <CardDescription>
              Jump straight into creating pixel art
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/generate?style=CHARACTER">
                Character Sprite
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/generate?style=ITEM">
                Item Icon
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/generate?style=TILE">
                Tileable Texture
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Creations
            </CardTitle>
            <CardDescription>
              Your latest pixel art
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentGenerations.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {recentGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className="aspect-square rounded-md overflow-hidden bg-muted"
                  >
                    <img
                      src={gen.imageUrl!}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No generations yet. Create your first one!
              </p>
            )}
            {recentGenerations.length > 0 && (
              <Button asChild variant="link" className="w-full mt-2">
                <Link href="/history">View all →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
