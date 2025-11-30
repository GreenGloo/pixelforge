import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata?.userId) {
          console.error('No userId in session metadata');
          break;
        }

        if (metadata.type === 'credit_pack') {
          // One-time credit pack purchase
          const credits = parseInt(metadata.credits || '0');

          await prisma.user.update({
            where: { id: metadata.userId },
            data: {
              credits: { increment: credits },
              stripeCustomerId: session.customer as string,
            },
          });

          await prisma.creditTransaction.create({
            data: {
              userId: metadata.userId,
              amount: credits,
              type: 'PURCHASE',
              description: `Purchased ${credits} credits`,
              stripePaymentId: session.payment_intent as string,
            },
          });

          console.log(`Added ${credits} credits to user ${metadata.userId}`);
        } else if (metadata.type === 'subscription') {
          // Subscription started
          const tierId = metadata.tierId;
          const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId);

          if (tier) {
            // Update user's plan
            const plan = tierId.toUpperCase() as 'HOBBY' | 'PRO' | 'TEAM';

            await prisma.user.update({
              where: { id: metadata.userId },
              data: {
                plan,
                credits: { increment: tier.monthlyCredits },
                stripeCustomerId: session.customer as string,
              },
            });

            await prisma.creditTransaction.create({
              data: {
                userId: metadata.userId,
                amount: tier.monthlyCredits,
                type: 'SUBSCRIPTION',
                description: `${tier.name} subscription - ${tier.monthlyCredits} credits`,
                stripePaymentId: session.subscription as string,
              },
            });

            console.log(`User ${metadata.userId} subscribed to ${tier.name}`);
          }
        }
        break;
      }

      case 'invoice.paid': {
        // Recurring subscription payment
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Get the subscription to find the customer
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer as string;

        // Find the user
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Get the tier from the user's plan
        const tier = SUBSCRIPTION_TIERS.find(
          (t) => t.id === user.plan?.toLowerCase()
        );

        if (tier && invoice.billing_reason === 'subscription_cycle') {
          // Add monthly credits
          await prisma.user.update({
            where: { id: user.id },
            data: { credits: { increment: tier.monthlyCredits } },
          });

          await prisma.creditTransaction.create({
            data: {
              userId: user.id,
              amount: tier.monthlyCredits,
              type: 'SUBSCRIPTION',
              description: `Monthly ${tier.name} credits`,
              stripePaymentId: invoice.id,
            },
          });

          console.log(`Added monthly ${tier.monthlyCredits} credits to user ${user.id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription canceled
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { plan: 'FREE' },
          });

          console.log(`User ${user.id} subscription canceled`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
