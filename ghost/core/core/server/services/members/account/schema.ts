import { z } from 'zod';
import { DbBoolean } from '../../../lib/db-types/boolean';
import { DbDate } from '../../../lib/db-types/date';

/**
 * The rows `queries.ts` returns, as the database hands them over.
 *
 * Only shapes, no rules: a value is refused here when it could not have come from
 * the column it claims to, and never because of what the projection would prefer.
 *
 * The two column codecs are the shared ones. Both engines disagree about what they
 * return — SQLite has no boolean and answers 0 or 1, and hands back a date as
 * `yyyy-MM-dd HH:mm:ss`, which `new Date()` would read in the machine's own
 * timezone rather than UTC — and those are exactly the disagreements
 * `lib/db-types` already settles.
 */

/** Nullable variants, since most of these columns admit null and the codecs do not. */
const NullableDate = z.union([DbDate, z.null()]);

export const MemberRow = z.object({
  id: z.string(),
  uuid: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  expertise: z.string().nullable(),
  // Stored as a JSON string; the commenting codec owns what is inside it.
  commenting: z.string().nullable(),
  enable_comment_notifications: DbBoolean,
  enable_updates_and_announcements: z.union([z.boolean(), z.number(), z.null()]),
  email_disabled: DbBoolean,
  created_at: DbDate,
  suppression_reason: z.string().nullable(),
  suppression_at: NullableDate,
});
export type MemberRow = z.infer<typeof MemberRow>;

export const NewsletterRow = z.object({
  member_id: z.string(),
  id: z.string(),
  uuid: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number(),
  status: z.string().nullable(),
});
export type NewsletterRow = z.infer<typeof NewsletterRow>;

/** The tier columns both subscription queries carry, under one name. */
const TierColumns = {
  tier_id: z.string(),
  tier_name: z.string(),
  tier_slug: z.string(),
  tier_active: DbBoolean,
  tier_welcome_page_url: z.string().nullable(),
  tier_visibility: z.string(),
  tier_trial_days: z.number(),
  tier_description: z.string().nullable(),
  tier_type: z.string(),
  tier_currency: z.string().nullable(),
  tier_monthly_price: z.number().nullable(),
  tier_yearly_price: z.number().nullable(),
  tier_monthly_price_id: z.string().nullable(),
  tier_yearly_price_id: z.string().nullable(),
  tier_created_at: DbDate,
  tier_updated_at: NullableDate,
  tier_expiry_at: NullableDate,
};

/** Parsed on its own so a subscription schema can decode its tier by nesting. */
export const TierRow = z.object(TierColumns);
export type TierRow = z.infer<typeof TierRow>;

export const StripeSubscriptionRow = z.object({
  member_id: z.string(),
  customer_id: z.string(),
  customer_name: z.string().nullable(),
  customer_email: z.string().nullable(),
  ghost_subscription_row_id: z.string(),
  subscription_id: z.string(),
  status: z.string(),
  cancel_at_period_end: DbBoolean,
  cancellation_reason: z.string().nullable(),
  current_period_end: NullableDate,
  start_date: DbDate,
  default_payment_card_last4: z.string().nullable(),
  trial_start_at: NullableDate,
  trial_end_at: NullableDate,
  discount_start: NullableDate,
  discount_end: NullableDate,
  offer_id: z.string().nullable(),
  plan_id: z.string().nullable(),
  plan_nickname: z.string(),
  plan_interval: z.string(),
  plan_amount: z.number(),
  plan_currency: z.string(),
  price_row_id: z.string(),
  price_stripe_id: z.string(),
  price_nickname: z.string().nullable(),
  price_amount: z.number(),
  price_currency: z.string(),
  price_interval: z.string(),
  price_type: z.string(),
  stripe_product_row_id: z.string(),
  stripe_product_id: z.string(),
  ...TierColumns,
});
export type StripeSubscriptionRow = z.infer<typeof StripeSubscriptionRow>;

export const GrantedSubscriptionRow = z.object({
  member_id: z.string(),
  customer_name: z.string().nullable(),
  customer_email: z.string(),
  member_status: z.string(),
  granted_at: NullableDate,
  ...TierColumns,
});
export type GrantedSubscriptionRow = z.infer<typeof GrantedSubscriptionRow>;

export const ActiveGiftRow = z.object({
  member_id: z.string(),
  cadence: z.string(),
  currency: z.string(),
  amount: z.number(),
});
export type ActiveGiftRow = z.infer<typeof ActiveGiftRow>;
