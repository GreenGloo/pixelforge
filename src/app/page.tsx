import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Zap,
  Palette,
  Download,
  Check,
  Play,
  Layers,
  Wand2,
  Grid3X3,
  RotateCw,
  Bone,
  ArrowRight,
  Star,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Pixel Art Generation',
    description: 'Generate characters, items, scenes, and tiles from text prompts. Our AI understands pixel art intrinsically.',
  },
  {
    icon: Play,
    title: 'AI Animation',
    description: 'Animate static sprites automatically. Create walk cycles, idle animations, and more with one click.',
  },
  {
    icon: Layers,
    title: 'Full Canvas Editor',
    description: 'Edit your sprites with professional tools. Layers, zoom, undo/redo, and all the tools you need.',
  },
  {
    icon: Wand2,
    title: 'Smart Inpainting',
    description: 'Select areas and let AI fill them in. Perfect for fixing details or adding elements.',
  },
  {
    icon: RotateCw,
    title: 'Sprite Rotations',
    description: 'Generate 4-way or 8-way character rotations from a single sprite. Perfect for top-down games.',
  },
  {
    icon: Grid3X3,
    title: 'Tileset Generator',
    description: 'Create complete tilesets with edges and corners. Export with metadata for your game engine.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Describe Your Vision',
    description: 'Enter a text prompt describing what you want. Choose a style preset for best results.',
  },
  {
    step: '2',
    title: 'Generate & Refine',
    description: 'AI generates your pixel art in seconds. Use the canvas editor to make any adjustments.',
  },
  {
    step: '3',
    title: 'Export & Use',
    description: 'Download PNG files with transparency. Import directly into Unity, Godot, or any game engine.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex Chen',
    role: 'Indie Developer',
    quote: 'PixelForge cut my sprite creation time by 80%. I finished my game jam entry with time to spare!',
    avatar: 'A',
  },
  {
    name: 'Sarah Martinez',
    role: 'Game Artist',
    quote: 'The animation feature is incredible. It understands pixel art movement perfectly.',
    avatar: 'S',
  },
  {
    name: 'Mike Johnson',
    role: 'Solo Dev',
    quote: 'Finally, an AI tool that actually produces usable game assets. The tileset generator is a game-changer.',
    avatar: 'M',
  },
];

const FAQ = [
  {
    question: 'How do credits work?',
    answer: 'Each AI generation costs 1-10 credits depending on complexity. Basic image generation is 1 credit, animations are 5 credits, and tilesets are 9-17 credits. Credits never expire!',
  },
  {
    question: 'Can I use the generated art commercially?',
    answer: 'Yes! All art you generate with PixelForge is yours to use commercially. You own full rights to your creations.',
  },
  {
    question: 'What game engines are supported?',
    answer: 'PixelForge exports standard PNG files that work with any engine: Unity, Godot, GameMaker, Construct, RPG Maker, and more.',
  },
  {
    question: 'Is there an API?',
    answer: 'Yes! Pro and Team subscribers get API access to integrate PixelForge directly into their workflow.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Navigation */}
      <header className="border-b border-[#2a2a4e] sticky top-0 bg-[#0f0f1a]/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PixelForge
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
              How it Works
            </Link>
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered Pixel Art for Game Developers
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Create{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Stunning Pixel Art
              </span>
              <br />
              in Seconds
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Generate characters, animations, tilesets, and more with AI.
              The fastest way to create game-ready pixel art.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Free (20 Credits)
                </Button>
              </Link>
              <Link href="/editor">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Play className="mr-2 h-5 w-5" />
                  Try the Editor
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a4e] p-4 shadow-2xl shadow-purple-500/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 ml-2">PixelForge Editor</span>
              </div>
              <div className="aspect-video bg-[#0f0f1a] rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {['Knight', 'Wizard', 'Slime', 'Chest'].map((item) => (
                      <div key={item} className="bg-[#2a2a4e] rounded-lg p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg mb-2 mx-auto" style={{ imageRendering: 'pixelated' }} />
                        <p className="text-xs text-gray-400">{item}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm">Generate pixel art from text prompts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-[#1a1a2e]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Create{' '}
              <span className="text-purple-400">Game-Ready Art</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A complete toolkit for indie developers. Generate, edit, animate, and export.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-[#1a1a2e] border-[#2a2a4e] hover:border-purple-500/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-purple-400" />
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How It <span className="text-pink-400">Works</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Create pixel art in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.step} className="relative">
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full">
                    <ArrowRight className="w-6 h-6 text-purple-500/50 -ml-3" />
                  </div>
                )}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold mx-auto mb-6">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-[#1a1a2e]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Loved by <span className="text-orange-400">Game Developers</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Join thousands of indie devs creating with PixelForge
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="bg-[#1a1a2e] border-[#2a2a4e]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Simple, <span className="text-green-400">Fair Pricing</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Pay as you go or subscribe. Credits never expire.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-[#1a1a2e] border-[#2a2a4e]">
              <CardHeader>
                <CardTitle className="text-white">Free</CardTitle>
                <CardDescription>Get started instantly</CardDescription>
                <div className="text-4xl font-bold text-white">$0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['20 credits on signup', 'All AI features', 'Canvas editor', 'PNG export'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a2e] border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-xs font-bold rounded-full">
                Best Value
              </div>
              <CardHeader>
                <CardTitle className="text-white">Value Pack</CardTitle>
                <CardDescription>One-time purchase</CardDescription>
                <div className="text-4xl font-bold text-white">$10</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['250 credits', 'Never expires', 'All AI features', 'Priority queue'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a2e] border-[#2a2a4e]">
              <CardHeader>
                <CardTitle className="text-white">Pro</CardTitle>
                <CardDescription>Monthly subscription</CardDescription>
                <div className="text-4xl font-bold text-white">$19<span className="text-lg font-normal">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['500 credits/month', 'Priority queue', 'API access', 'Priority support'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View All Pricing Options
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-[#1a1a2e]/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Frequently Asked <span className="text-purple-400">Questions</span>
            </h2>
          </div>
          <div className="grid gap-4">
            {FAQ.map((faq) => (
              <Card key={faq.question} className="bg-[#1a1a2e] border-[#2a2a4e]">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                    {faq.question}
                  </CardTitle>
                  <CardDescription className="text-gray-400 pt-2">
                    {faq.answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Create Pixel Art?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Start with 20 free credits. No credit card required.
            </p>
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[#2a2a4e]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-purple-400" />
                <span className="text-xl font-bold">PixelForge</span>
              </div>
              <p className="text-sm text-gray-500">
                AI-powered pixel art generator for indie game developers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-sm text-gray-400 hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-gray-400 hover:text-white">Pricing</Link></li>
                <li><Link href="/editor" className="text-sm text-gray-400 hover:text-white">Editor</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link href="#faq" className="text-sm text-gray-400 hover:text-white">FAQ</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-400 hover:text-white">Contact</Link></li>
                <li><Link href="/docs" className="text-sm text-gray-400 hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#2a2a4e] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2024 PixelForge. Built for indie game developers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
