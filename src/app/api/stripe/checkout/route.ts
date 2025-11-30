import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, createSubscriptionSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, packId, tierId } = body;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/pricing?success=true`;
    const cancelUrl = `${baseUrl}/pricing?canceled=true`;

    let checkoutSession;

    if (type === 'credit_pack' && packId) {
      checkoutSession = await createCheckoutSession({
        userId: session.user.id,
        userEmail: session.user.email,
        packId,
        successUrl,
        cancelUrl,
      });
    } else if (type === 'subscription' && tierId) {
      checkoutSession = await createSubscriptionSession({
        userId: session.user.id,
        userEmail: session.user.email,
        tierId,
        successUrl,
        cancelUrl,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid checkout type' },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
