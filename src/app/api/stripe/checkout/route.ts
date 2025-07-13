import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { createOrRetrieveCustomer, createCheckoutSession } from '@/libs/stripe';
import { getUserSubscription } from '@/libs/DB';
import { Env } from '@/libs/Env';

export async function POST(req: NextRequest) {
  try {
    console.log('req', req);
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return new NextResponse('Price ID is required', { status: 400 });
    }

    // Get user subscription to check if they already have a Stripe subscription
    const subscription = await getUserSubscription(userId);

    if (subscription?.stripeSubscriptionStatus) {
      return new NextResponse('User already has an active Stripe subscription', {
        status: 400,
      });
    }

    // Get user email from Clerk
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      return new NextResponse('User email not found', { status: 400 });
    }

    // Create or retrieve Stripe customer
    const customerId = await createOrRetrieveCustomer({
      email,
      userId,
    });

    console.log('customerId', customerId);

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      customerId,
      successUrl: `${Env.BASE_URL}/dashboard/billing?success=true`,
      cancelUrl: `${Env.BASE_URL}/dashboard/billing?canceled=true`,
      userId,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 