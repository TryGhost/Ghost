import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const planTable = sqliteTable('plans', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug'),
    description: text('description'),
    type: text('type').notNull().default('paid'),
    active: integer('active').notNull().default(1),
    visibility: text('visibility').notNull().default('public'),
    trialDays: integer('trial_days').notNull().default(0),
    welcomePageUrl: text('welcome_page_url'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const priceTable = sqliteTable('prices', {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull(),
    cadence: text('cadence').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull()
});

export const offerTable = sqliteTable('offers', {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    active: integer('active').notNull()
});

export const offerRedemptionTable = sqliteTable('offer_redemptions', {
    id: text('id').primaryKey(),
    offerId: text('offer_id').notNull(),
    memberId: text('member_id').notNull(),
    createdAt: integer('created_at').notNull()
});

export const checkoutSessionTable = sqliteTable('checkout_sessions', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    priceId: text('price_id').notNull(),
    offerId: text('offer_id'),
    createdAt: integer('created_at').notNull(),
    completedAt: integer('completed_at')
});

export const subscriptionTable = sqliteTable('subscriptions', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    priceId: text('price_id').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull(),
    cancelledAt: integer('cancelled_at')
});

export const billingAccountTable = sqliteTable('billing_accounts', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    provider: text('provider').notNull(),
    providerCustomerId: text('provider_customer_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const contentEntitlementTable = sqliteTable('content_entitlements', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    createdAt: integer('created_at').notNull()
});

export const subscriptionEventTable = sqliteTable('subscription_events', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    type: text('type').notNull(),
    createdAt: integer('created_at').notNull()
});

export type PlanRecord = typeof planTable.$inferSelect;
export type NewPlanRecord = typeof planTable.$inferInsert;
export type PriceRecord = typeof priceTable.$inferSelect;
export type NewPriceRecord = typeof priceTable.$inferInsert;
export type OfferRecord = typeof offerTable.$inferSelect;
export type NewOfferRecord = typeof offerTable.$inferInsert;
export type OfferRedemptionRecord = typeof offerRedemptionTable.$inferSelect;
export type NewOfferRedemptionRecord = typeof offerRedemptionTable.$inferInsert;
export type CheckoutSessionRecord = typeof checkoutSessionTable.$inferSelect;
export type NewCheckoutSessionRecord = typeof checkoutSessionTable.$inferInsert;
export type SubscriptionRecord = typeof subscriptionTable.$inferSelect;
export type NewSubscriptionRecord = typeof subscriptionTable.$inferInsert;
export type BillingAccountRecord = typeof billingAccountTable.$inferSelect;
export type NewBillingAccountRecord = typeof billingAccountTable.$inferInsert;
export type ContentEntitlementRecord = typeof contentEntitlementTable.$inferSelect;
export type NewContentEntitlementRecord = typeof contentEntitlementTable.$inferInsert;
export type SubscriptionEventRecord = typeof subscriptionEventTable.$inferSelect;
export type NewSubscriptionEventRecord = typeof subscriptionEventTable.$inferInsert;
