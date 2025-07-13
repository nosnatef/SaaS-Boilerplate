import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants';
import { Client } from 'pg';
import { eq, sql, desc, and } from 'drizzle-orm';

import * as schema from '@/models/Schema';

import { Env } from './Env';

let client;
let drizzle;

if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD && Env.DATABASE_URL) {
  client = new Client({
    connectionString: Env.DATABASE_URL,
  });
  await client.connect();

  drizzle = drizzlePg(client, { schema });
  await migratePg(drizzle, {
    migrationsFolder: path.join(process.cwd(), 'migrations'),
  });
} else {
  // Stores the db connection in the global scope to prevent multiple instances due to hot reloading with Next.js
  const global = globalThis as unknown as { client: PGlite; drizzle: PgliteDatabase<typeof schema> };

  if (!global.client) {
    global.client = new PGlite();
    await global.client.waitReady;

    global.drizzle = drizzlePglite(global.client, { schema });
  }

  drizzle = global.drizzle;
  await migratePglite(global.drizzle, {
    migrationsFolder: path.join(process.cwd(), 'migrations'),
  });
}

export const db = drizzle;

// Webhook event idempotency functions
export async function isWebhookEventProcessed(eventId: string) {
  const event = await db
    .select()
    .from(schema.webhookEventsSchema)
    .where(eq(schema.webhookEventsSchema.id, eventId))
    .limit(1);

  return event.length > 0;
}

export async function recordWebhookEvent({
  eventId,
  eventType,
  userId,
  metadata,
}: {
  eventId: string;
  eventType: string;
  userId?: string;
  metadata?: string;
}) {
  const event = await db
    .insert(schema.webhookEventsSchema)
    .values({
      id: eventId,
      eventType,
      userId,
      metadata,
    })
    .returning();

  return event[0];
}

export async function updateWebhookEventUserId(eventId: string, userId: string) {
  const event = await db
    .update(schema.webhookEventsSchema)
    .set({ userId })
    .where(eq(schema.webhookEventsSchema.id, eventId))
    .returning();

  return event[0];
}

export async function getUserSubscription(userId: string) {
  const subscription = await db
    .select()
    .from(schema.userSubscriptionSchema)
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .limit(1);

  return subscription[0];
}

export async function createUserSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeSubscriptionPriceId,
  stripeSubscriptionStatus,
  stripeSubscriptionCurrentPeriodEnd,
}: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionPriceId: string;
  stripeSubscriptionStatus: string;
  stripeSubscriptionCurrentPeriodEnd: number;
}) {
  const subscription = await db
    .insert(schema.userSubscriptionSchema)
    .values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeSubscriptionPriceId,
      stripeSubscriptionStatus,
      stripeSubscriptionCurrentPeriodEnd,
    })
    .returning();

  return subscription[0];
}

export async function updateUserSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeSubscriptionPriceId,
  stripeSubscriptionStatus,
  stripeSubscriptionCurrentPeriodEnd,
}: {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionPriceId?: string;
  stripeSubscriptionStatus?: string;
  stripeSubscriptionCurrentPeriodEnd?: number;
}) {
  const subscription = await db
    .update(schema.userSubscriptionSchema)
    .set({
      stripeCustomerId,
      stripeSubscriptionId,
      stripeSubscriptionPriceId,
      stripeSubscriptionStatus,
      stripeSubscriptionCurrentPeriodEnd,
    })
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .returning();

  return subscription[0];
}

export async function deleteUserSubscription(userId: string) {
  const subscription = await db
    .delete(schema.userSubscriptionSchema)
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .returning();

  return subscription[0];
}

export async function createBasicUserSubscription(userId: string) {
  const subscription = await db
    .insert(schema.userSubscriptionSchema)
    .values({
      userId,
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      stripeSubscriptionPriceId: '',
      stripeSubscriptionStatus: '',
      stripeSubscriptionCurrentPeriodEnd: 0,
      token: 10,
    })
    .returning();

  return subscription[0];
}

// Token management functions
export async function getUserTokenCount(userId: string) {
  const subscription = await db
    .select({ token: schema.userSubscriptionSchema.token })
    .from(schema.userSubscriptionSchema)
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .limit(1);

  return subscription[0]?.token || 0;
}

export async function decrementUserTokens(userId: string) {
  const subscription = await db
    .update(schema.userSubscriptionSchema)
    .set({
      token: sql`GREATEST(${schema.userSubscriptionSchema.token} - 1, 0)`,
    })
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .returning();

  return subscription[0];
}

export async function addUserTokens(userId: string, tokens: number) {
  // Add validation
  if (tokens <= 0 || tokens > 10000) {
    throw new Error('Invalid token amount');
  }
  
  const subscription = await db
    .update(schema.userSubscriptionSchema)
    .set({
      token: sql`LEAST(${schema.userSubscriptionSchema.token} + ${tokens}, 100000)`, // Cap at 100k
    })
    .where(eq(schema.userSubscriptionSchema.userId, userId))
    .returning();

  return subscription[0];
}

// User content functions
export async function createUserContent({
  userId,
  content,
  createdBy,
  isPublic = false,
}: {
  userId: string;
  content: string;
  createdBy: string;
  isPublic?: boolean;
}) {
  const userContent = await db
    .insert(schema.userContentSchema)
    .values({
      userId,
      content,
      createdBy,
      isPublic: isPublic ? 1 : 0,
    })
    .returning();

  return userContent[0];
}

export async function getUserContent(userId: string) {
  const userContent = await db
    .select()
    .from(schema.userContentSchema)
    .where(eq(schema.userContentSchema.userId, userId))
    .orderBy(desc(schema.userContentSchema.createdAt));

  return userContent;
}

export async function deleteUserContent(contentId: number, userId: string) {
  const userContent = await db
    .delete(schema.userContentSchema)
    .where(
      and(
        eq(schema.userContentSchema.id, contentId),
        eq(schema.userContentSchema.userId, userId)
      )
    )
    .returning();

  return userContent[0];
}

export async function consumeTokenAndCreateContent({
  userId,
  content,
  createdBy,
}: {
  userId: string;
  content: string;
  createdBy: string;
}) {
  return await db.transaction(async (tx) => {
    // Check and decrement tokens atomically
    const subscription = await tx
      .update(schema.userSubscriptionSchema)
      .set({
        token: sql`GREATEST(${schema.userSubscriptionSchema.token} - 1, 0)`,
      })
      .where(
        and(
          eq(schema.userSubscriptionSchema.userId, userId),
          sql`${schema.userSubscriptionSchema.token} > 0`
        )
      )
      .returning();

    if (!subscription[0]) {
      throw new Error('Insufficient tokens');
    }

    // Create content
    const userContent = await tx
      .insert(schema.userContentSchema)
      .values({
        userId,
        content,
        createdBy,
      })
      .returning();

    return {
      content: userContent[0],
      remainingTokens: subscription[0].token,
    };
  });
}
