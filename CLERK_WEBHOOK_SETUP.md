# Clerk Webhook Setup

This document explains how to set up the Clerk webhook to automatically create user subscriptions when users sign up.

## Overview

Instead of using the `/api/tokens/init` endpoint to manually initialize user subscriptions, the system now uses a Clerk webhook to automatically create a basic user subscription with free tokens when a user signs up. This approach is more secure and provides a better user experience.

## Setup Instructions

### 1. Configure Clerk Webhook

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Set the following configuration:
   - **Endpoint URL**: `https://your-domain.com/api/clerk/webhook`
   - **Version**: `v1`
   - **Events**: Select the following events:
     - `user.created` (required)
     - `user.updated` (optional)
     - `user.deleted` (optional)

### 2. Get Webhook Secret

1. After creating the webhook, click on it to view details
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Add it to your environment variables:

```bash
# .env.local
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Deploy Your Application

Make sure your application is deployed and accessible at the webhook URL you configured.

### 4. Test the Webhook

1. Create a new user account in your application
2. Check the webhook logs in your Clerk Dashboard
3. Verify that a subscription record is created in your database

## How It Works

### Webhook Handler (`/api/clerk/webhook`)

The webhook handler:

1. **Verifies the webhook signature** using the `svix` library
2. **Processes `user.created` events** by:
   - Checking if the user already has a subscription record
   - Creating a basic user subscription with 10 free tokens if none exists
3. **Logs all events** for debugging purposes

### Database Changes

When a user signs up:
- A `user_subscription` record is created with:
  - `userId`: The Clerk user ID
  - `token`: 10 (free tier tokens)
  - Empty Stripe fields (will be populated when they subscribe)

### Frontend Changes

The frontend no longer calls `/api/tokens/init`:
- If a user doesn't have a subscription record, it shows a warning
- This should rarely happen since the webhook creates the record automatically

## Security Benefits

1. **No manual initialization**: Users can't abuse the init endpoint
2. **Automatic provisioning**: Every user gets a subscription record immediately
3. **Webhook verification**: All webhook requests are cryptographically verified
4. **Idempotent**: Multiple webhook calls for the same user won't create duplicate records

## Troubleshooting

### Webhook Not Working

1. Check that the webhook URL is accessible
2. Verify the webhook secret is correctly set
3. Check the webhook logs in Clerk Dashboard
4. Review your application logs for errors

### User Has No Subscription

If a user doesn't have a subscription record:
1. Check if the webhook is properly configured
2. Verify the webhook secret matches
3. Check if the webhook endpoint is accessible
4. Look for errors in your application logs

### Manual Fix

If needed, you can manually create a subscription for a user:

```sql
INSERT INTO user_subscription (user_id, token, created_at, updated_at)
VALUES ('user_clerk_id_here', 10, NOW(), NOW());
```

## Migration from Old System

If you're migrating from the old `/api/tokens/init` system:

1. Set up the Clerk webhook as described above
2. The webhook will handle new users automatically
3. Existing users without subscription records can be handled by:
   - Manually creating records in the database, or
   - Having them sign up again with a new account

## Environment Variables

Make sure you have these environment variables set:

```bash
# Required
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Optional (for development)
DATABASE_URL=postgresql://...
``` 