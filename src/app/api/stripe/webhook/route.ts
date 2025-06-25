import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { stripe } from '@/libs/stripe';
import { Env } from '@/libs/Env';
import {
  getUserSubscription,
  createUserSubscription,
  updateUserSubscription,
  deleteUserSubscription,
} from '@/libs/DB';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return new NextResponse('No signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, Env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        if (subscription) {
          const customerId = session.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer && !customer.deleted && 'metadata' in customer) {
            const userId = customer.metadata.userId;

            if (userId) {
              await createUserSubscription({
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscription.id,
                stripeSubscriptionPriceId: subscription.items.data[0]?.price.id || '',
                stripeSubscriptionStatus: subscription.status,
                stripeSubscriptionCurrentPeriodEnd: subscription.current_period_end,
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer && !customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata.userId;

          if (userId) {
            await updateUserSubscription({
              userId,
              stripeSubscriptionId: subscription.id,
              stripeSubscriptionPriceId: subscription.items.data[0]?.price.id || '',
              stripeSubscriptionStatus: subscription.status,
              stripeSubscriptionCurrentPeriodEnd: subscription.current_period_end,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer && !customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata.userId;

          if (userId) {
            await deleteUserSubscription(userId);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
} 