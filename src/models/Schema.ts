import {
  bigint,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  integer
} from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// The migration is automatically applied during the next database interaction,
// so there's no need to run it manually or restart the Next.js server.

// Organization schema removed as organization requirement is no longer needed

export const todoSchema = pgTable(
  'todo',
  {
    id: serial('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
);

export const userSubscriptionSchema = pgTable(
  'user_subscription',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeSubscriptionPriceId: text('stripe_subscription_price_id'),
    stripeSubscriptionStatus: text('stripe_subscription_status'),
    stripeSubscriptionCurrentPeriodEnd: bigint(
      'stripe_subscription_current_period_end',
      { mode: 'number' },
    ),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    token: integer().default(10),
  },
  (table) => {
    return {
      stripeCustomerIdIdx: uniqueIndex('stripe_customer_id_idx').on(
        table.stripeCustomerId,
      ),
      userIdIdx: uniqueIndex('user_id_idx').on(table.userId),
    };
  },
);

export const webhookEventsSchema = pgTable(
  'webhook_events',
  {
    id: text('id').primaryKey(), // Stripe event ID
    eventType: text('event_type').notNull(),
    processedAt: timestamp('processed_at', { mode: 'date' }).defaultNow().notNull(),
    userId: text('user_id'),
    metadata: text('metadata'), // JSON string for additional data
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => {
    return {
      eventTypeIdx: uniqueIndex('webhook_event_type_idx').on(table.eventType),
      userIdIdx: uniqueIndex('webhook_user_id_idx').on(table.userId),
    };
  },
);

export const userContentSchema = pgTable(
  'user_content',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(), // Foreign key relation (logical, not enforced unless you define FK separately)
    content: text('content').notNull(), // text type works like varchar without length limit
    createdBy: text('created_by').notNull(),
    isPublic: integer('is_public').default(0).notNull(), // 0 = false, 1 = true (or use boolean if preferred)
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => {
    return {
      userIdIdx: uniqueIndex('user_content_user_id_idx').on(table.id, table.userId),
    };
  }
);
