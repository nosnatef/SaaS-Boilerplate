import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

import { createBasicUserSubscription, getUserSubscription } from '@/libs/DB';
import { Env } from '@/libs/Env';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = Env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return new NextResponse('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error verifying webhook', { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('Clerk webhook: Event received:', eventType, 'ID:', evt.data.id);

  try {
    switch (eventType) {
      case 'user.created': {
        const userId = evt.data.id;
        console.log('Clerk webhook: Processing user.created for user:', userId);

        // Check if user already has a subscription record (shouldn't happen, but safety check)
        const existingSubscription = await getUserSubscription(userId);
        
        if (existingSubscription) {
          console.log('Clerk webhook: User already has subscription record:', userId);
          return new NextResponse('User already has subscription', { status: 200 });
        }

        // Create basic user subscription with free tokens
        await createBasicUserSubscription(userId);
        console.log('Clerk webhook: Created basic subscription for user:', userId);
        break;
      }

      case 'user.updated': {
        // Handle user updates if needed
        console.log('Clerk webhook: User updated:', evt.data.id);
        break;
      }

      case 'user.deleted': {
        // Handle user deletion if needed
        console.log('Clerk webhook: User deleted:', evt.data.id);
        break;
      }

      default:
        console.log(`Clerk webhook: Unhandled event type: ${eventType}`);
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Clerk webhook: Error processing webhook:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
} 