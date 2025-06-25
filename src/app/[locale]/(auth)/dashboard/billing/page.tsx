'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { MessageState } from '@/features/dashboard/MessageState';
import { PricingCard } from '@/features/billing/PricingCard';
import { PricingFeature } from '@/features/billing/PricingFeature';
import { PLAN_ID, PricingPlanList } from '@/utils/AppConfig';
import { loadStripe } from '@stripe/stripe-js';
import { Env } from '@/libs/Env';

const stripePromise = loadStripe(Env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const BillingPage = () => {
  const t = useTranslations('Billing');
  const tPricing = useTranslations('PricingPlan');
  const tBillingOptions = useTranslations('BillingOptions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success) {
      // Show success message
      console.log('Payment successful!');
    }
    if (canceled) {
      // Show canceled message
      console.log('Payment canceled.');
    }
  }, [success, canceled]);

  const handleSubscribe = async (priceId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: "price_1Re2E7BGLMf9HCnJBxGslUAu" }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe error:', error);
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      router.push(url);
    } catch (error) {
      console.error('Error creating customer portal session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {success && (
        <MessageState
          icon={(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
          title="Payment Successful!"
          description="Your subscription has been activated successfully."
          button={(
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </button>
          )}
        />
      )}

      {canceled && (
        <MessageState
          icon={(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
          title="Payment Canceled"
          description="Your payment was canceled. You can try again anytime."
          button={(
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </button>
          )}
        />
      )}

      {!success && !canceled && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">{t('current_section_title')}</h2>
            <p className="text-muted-foreground">
              {t('current_section_description')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {Object.values(PricingPlanList).map((plan) => (
              <PricingCard
                key={plan.id}
                planId={plan.id}
                price={plan.price}
                interval={plan.interval}
                button={(
                  <button
                    onClick={() => handleSubscribe(plan.devPriceId)}
                    disabled={isLoading}
                    className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : tBillingOptions('upgrade_plan')}
                  </button>
                )}
              >
                <PricingFeature>
                  {tPricing('feature_team_member', { number: plan.features.teamMember })}
                </PricingFeature>
                <PricingFeature>
                  {tPricing('feature_website', { number: plan.features.website })}
                </PricingFeature>
                <PricingFeature>
                  {tPricing('feature_storage', { number: plan.features.storage })}
                </PricingFeature>
                <PricingFeature>
                  {tPricing('feature_transfer', { number: plan.features.transfer })}
                </PricingFeature>
                <PricingFeature>
                  {tPricing('feature_email_support')}
                </PricingFeature>
              </PricingCard>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={handleManageSubscription}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : t('manage_subscription_button')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BillingPage; 