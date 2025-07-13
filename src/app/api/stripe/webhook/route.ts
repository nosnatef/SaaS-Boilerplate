import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { stripe } from '@/libs/stripe';
import { Env } from '@/libs/Env';
import {
  getUserSubscription,
  createUserSubscription,
  updateUserSubscription,
  addUserTokens,
  isWebhookEventProcessed,
  recordWebhookEvent,
  updateWebhookEventUserId,
} from '@/libs/DB';

// Function to get token amount based on price ID
function getTokenAmountForPrice(priceId: string): number {
  // You can customize this based on your pricing plans
  // For now, returning 100 tokens for any subscription
  return 100;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.error('Webhook: No signature provided');
    return new NextResponse('No signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, Env.STRIPE_WEBHOOK_SECRET);
    console.log('Webhook: Event received:', event.type, 'ID:', event.id);
  } catch (error) {
    console.error('Webhook: Signature verification failed:', error);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  try {
    // Check if event was already processed
    const alreadyProcessed = await isWebhookEventProcessed(event.id);
    if (alreadyProcessed) {
      console.log('Webhook: Event already processed:', event.id);
      return new NextResponse('Event already processed', { status: 200 });
    }

    // Record the event before processing to prevent race conditions
    await recordWebhookEvent({
      eventId: event.id,
      eventType: event.type,
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Webhook: Processing checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        if (subscription) {
          const customerId = session.customer as string;
          console.log('Webhook: Customer ID:', customerId);
          
          const customer = await stripe.customers.retrieve(customerId);
          console.log('Webhook: Customer retrieved:', customer?.id, 'Deleted:', customer?.deleted);
          
          if (customer && !customer.deleted && 'metadata' in customer) {
            const userId = customer.metadata.userId;
            console.log('Webhook: User ID from metadata:', userId);

            if (userId) {
              console.log('Webhook: Processing subscription for user:', userId);
              
              // Update webhook event with userId
              await updateWebhookEventUserId(event.id, userId);
              
              // Check if user already has a subscription record
              const existingSubscription = await getUserSubscription(userId);
              
              if (existingSubscription) {
                // Update existing subscription
                console.log('Webhook: Updating existing subscription');
                await updateUserSubscription({
                  userId,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscription.id,
                  stripeSubscriptionPriceId: subscription.items.data[0]?.price.id || '',
                  stripeSubscriptionStatus: subscription.status,
                  stripeSubscriptionCurrentPeriodEnd: subscription.current_period_end,
                });
              } else {
                // Create new subscription
                console.log('Webhook: Creating new subscription');
                await createUserSubscription({
                  userId,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscription.id,
                  stripeSubscriptionPriceId: subscription.items.data[0]?.price.id || '',
                  stripeSubscriptionStatus: subscription.status,
                  stripeSubscriptionCurrentPeriodEnd: subscription.current_period_end,
                });
              }

              // Add tokens based on subscription plan
              const priceId = subscription.items.data[0]?.price.id;
              if (priceId) {
                const tokenAmount = getTokenAmountForPrice(priceId);
                console.log('Webhook: Adding tokens:', tokenAmount);
                await addUserTokens(userId, tokenAmount);
              }
            } else {
              console.error('Webhook: No userId found in customer metadata');
            }
          } else {
            console.error('Webhook: Invalid customer or customer deleted');
          }
        } else {
          console.error('Webhook: No subscription found in session');
        }
        break;
      }

      case 'customer.subscription.updated': {
        console.log('Webhook: Processing customer.subscription.updated');
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer && !customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata.userId;

          if (userId) {
            console.log('Webhook: Updating subscription for user:', userId);
            
            // Update webhook event with userId
            await updateWebhookEventUserId(event.id, userId);
            
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

      case 'invoice.payment_succeeded': {
        console.log('Webhook: Processing invoice.payment_succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process if this is a subscription renewal (not initial payment)
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (customer && !customer.deleted && 'metadata' in customer) {
            const userId = customer.metadata.userId;

            if (userId) {
              console.log('Webhook: Processing renewal for user:', userId);
              
              // Update webhook event with userId
              await updateWebhookEventUserId(event.id, userId);
              
              // Add tokens for renewal
              const priceId = subscription.items.data[0]?.price.id;
              if (priceId) {
                const tokenAmount = getTokenAmountForPrice(priceId);
                console.log('Webhook: Adding renewal tokens:', tokenAmount);
                await addUserTokens(userId, tokenAmount);
              }
            }
          }
        }
        break;
      }

      default:
        console.log(`Webhook: Unhandled event type: ${event.type}`);
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook: Error processing webhook:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
} 