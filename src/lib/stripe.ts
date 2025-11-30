import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Credit pack definitions
export const CREDIT_PACKS = [
  {
    id: 'pack_5',
    name: 'Starter Pack',
    credits: 100,
    price: 500, // $5 in cents
    priceDisplay: '$5',
    description: '100 credits to get started',
  },
  {
    id: 'pack_10',
    name: 'Value Pack',
    credits: 250,
    price: 1000, // $10 in cents
    priceDisplay: '$10',
    description: '250 credits - Best value!',
    badge: 'Best Value',
  },
  {
    id: 'pack_25',
    name: 'Pro Pack',
    credits: 700,
    price: 2500, // $25 in cents
    priceDisplay: '$25',
    description: '700 credits for serious creators',
  },
  {
    id: 'pack_50',
    name: 'Studio Pack',
    credits: 1500,
    price: 5000, // $50 in cents
    priceDisplay: '$50',
    description: '1500 credits for teams and studios',
  },
];

// Subscription tiers
export const SUBSCRIPTION_TIERS = [
  {
    id: 'hobby',
    name: 'Hobby',
    monthlyCredits: 200,
    price: 900, // $9/month in cents
    priceDisplay: '$9/mo',
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
    price: 1900, // $19/month in cents
    priceDisplay: '$19/mo',
    features: [
      '500 credits per month',
      'All AI features',
      'Priority queue',
      'Batch generation',
      'Priority support',
    ],
    badge: 'Popular',
  },
  {
    id: 'team',
    name: 'Team',
    monthlyCredits: 1500,
    price: 4900, // $49/month in cents
    priceDisplay: '$49/mo',
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

export async function createCheckoutSession({
  userId,
  userEmail,
  packId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  packId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    throw new Error('Invalid pack ID');
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PixelForge ${pack.name}`,
            description: pack.description,
          },
          unit_amount: pack.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      packId,
      credits: pack.credits.toString(),
      type: 'credit_pack',
    },
  });

  return session;
}

export async function createSubscriptionSession({
  userId,
  userEmail,
  tierId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  tierId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    throw new Error('Invalid tier ID');
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PixelForge ${tier.name}`,
            description: `${tier.monthlyCredits} credits per month`,
          },
          unit_amount: tier.price,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tierId,
      monthlyCredits: tier.monthlyCredits.toString(),
      type: 'subscription',
    },
  });

  return session;
}

export async function getCustomerPortalUrl({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
