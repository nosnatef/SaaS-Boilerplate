import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { createCustomerPortalSession } from '@/libs/stripe';
import { getUserSubscription } from '@/libs/DB';
import { Env } from '@/libs/Env';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user subscription
    const subscription = await getUserSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return new NextResponse('No subscription found', { status: 400 });
    }

    // Create customer portal session
    const session = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${Env.BASE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 