'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Check,
  Sparkles,
  Zap,
  Users,
  Home,
  Loader2,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

const CREDIT_PACKS = [
  {
    id: 'pack_5',
    name: 'Starter Pack',
    credits: 100,
    priceDisplay: '$5',
    description: '100 credits to get started',
  },
  {
    id: 'pack_10',
    name: 'Value Pack',
    credits: 250,
    priceDisplay: '$10',
    description: '250 credits - Best value!',
    badge: 'Best Value',
  },
  {
    id: 'pack_25',
    name: 'Pro Pack',
    credits: 700,
    priceDisplay: '$25',
    description: '700 credits for serious creators',
  },
  {
    id: 'pack_50',
    name: 'Studio Pack',
    credits: 1500,
    priceDisplay: '$50',
    description: '1500 credits for teams and studios',
  },
];

const SUBSCRIPTION_TIERS = [
  {
    id: 'hobby',
    name: 'Hobby',
    monthlyCredits: 200,
    priceDisplay: '$9/mo',
    icon: Sparkles,
    features: [
      '200 credits per month',
      'All AI features',
      'Canvas editor',
      'Animation tools',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyCredits: 500,
    priceDisplay: '$19/mo',
    icon: Zap,
    badge: 'Popular',
    features: [
      '500 credits per month',
      'All AI features',
      'Priority queue',
      'Batch generation',
      'Priority support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyCredits: 1500,
    priceDisplay: '$49/mo',
    icon: Users,
    features: [
      '1500 credits per month',
      'All AI features',
      'Priority queue',
      'Team collaboration',
      'API access',
      'Dedicated support',
    ],
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Payment successful! Credits have been added to your account.' });
    } else if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Payment was canceled.' });
    }
  }, [searchParams]);

  const handleBuyPack = async (packId: string) => {
    if (!session) {
      signIn();
      return;
    }

    setLoadingPack(packId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credit_pack', packId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create checkout' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoadingPack(null);
    }
  };

  const handleSubscribe = async (tierId: string) => {
    if (!session) {
      signIn();
      return;
    }

    setLoadingTier(tierId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', tierId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create checkout' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a4e]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PixelForge
            </span>
          </Link>

          {session?.user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {session.user.credits} credits
              </span>
              <Link href="/editor">
                <Button size="sm">
                  Go to Editor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Message */}
        {message && (
          <div
            className={`mb-8 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Simple, Transparent{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Pay only for what you use with credit packs, or save with a monthly subscription.
            Credits never expire!
          </p>
        </div>

        {/* Credit Packs */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-8">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold">Credit Packs</h2>
            <span className="text-sm text-gray-500 ml-2">One-time purchase, never expires</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative bg-[#1a1a2e] border rounded-xl p-6 ${
                  pack.badge ? 'border-purple-500' : 'border-[#2a2a4e]'
                }`}
              >
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-xs font-bold rounded-full">
                    {pack.badge}
                  </div>
                )}

                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-1">{pack.name}</h3>
                  <div className="text-3xl font-bold mb-1">{pack.priceDisplay}</div>
                  <p className="text-sm text-gray-400 mb-4">
                    {pack.credits} credits
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant={pack.badge ? 'default' : 'outline'}
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={loadingPack === pack.id}
                >
                  {loadingPack === pack.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Buy Now'
                  )}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Subscriptions */}
        <section>
          <div className="flex items-center gap-2 mb-8">
            <Zap className="w-5 h-5 text-pink-400" />
            <h2 className="text-2xl font-bold">Monthly Subscriptions</h2>
            <span className="text-sm text-gray-500 ml-2">Credits refresh every month</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.id}
                  className={`relative bg-[#1a1a2e] border rounded-xl p-6 ${
                    tier.badge ? 'border-purple-500' : 'border-[#2a2a4e]'
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-xs font-bold rounded-full">
                      {tier.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{tier.name}</h3>
                      <div className="text-2xl font-bold">{tier.priceDisplay}</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-6">
                    {tier.monthlyCredits} credits every month
                  </p>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={tier.badge ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loadingTier === tier.id}
                  >
                    {loadingTier === tier.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : session?.user?.plan === tier.id.toUpperCase() ? (
                      'Current Plan'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-center">FAQ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl p-6">
              <h3 className="font-semibold mb-2">How do credits work?</h3>
              <p className="text-sm text-gray-400">
                Each AI generation costs 1-10 credits depending on the feature.
                Basic image generation is 1 credit, animations are 5 credits,
                and tilesets are 9-17 credits.
              </p>
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl p-6">
              <h3 className="font-semibold mb-2">Do credits expire?</h3>
              <p className="text-sm text-gray-400">
                No! Credit pack purchases never expire. Subscription credits
                refresh monthly but unused credits roll over.
              </p>
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl p-6">
              <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-sm text-gray-400">
                Yes, you can cancel anytime. You'll keep access until the end
                of your billing period.
              </p>
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-gray-400">
                We accept all major credit cards, debit cards, and some local
                payment methods through Stripe.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
