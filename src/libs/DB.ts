import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants';
import { Client } from 'pg';
import { eq } from 'drizzle-orm';

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
