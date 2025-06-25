import Stripe from 'stripe';

import { Env } from '@/libs/Env';

export const stripe = new Stripe(Env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function createOrRetrieveCustomer({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  let customerId: string;

  if (existingCustomers.data.length > 0) {
    const existingCustomer = existingCustomers.data[0];
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
    }
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });
    customerId = customer.id;
  }

  return customerId;
}

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId: customerId,
      },
    },
  });

  return session;
}

export async function createCustomerPortalSession({
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

  return session;
} 