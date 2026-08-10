import {z} from 'zod';
import {DbDate} from '../../lib/db-date';
import type {CamelKeys} from '../../lib/case-keys';

export const GiftCadenceSchema = z.enum(['month', 'year']);
export const GiftStatusSchema = z.enum(['purchased', 'redeemed', 'consumed', 'expired', 'refunded']);
export const GiftDeliveryMethodSchema = z.enum(['link', 'email']);
export const GiftDeliveryStatusSchema = z.enum(['pending', 'sending', 'sent', 'failed']);
export const GiftDeliveryOutcomeSchema = z.enum(['unknown', 'delivered', 'temporary_failed', 'permanent_failed']);
export type GiftCadence = z.infer<typeof GiftCadenceSchema>;
export type GiftStatus = z.infer<typeof GiftStatusSchema>;
export type GiftDeliveryMethod = z.infer<typeof GiftDeliveryMethodSchema>;
export type GiftDeliveryStatus = z.infer<typeof GiftDeliveryStatusSchema>;
export type GiftDeliveryOutcome = z.infer<typeof GiftDeliveryOutcomeSchema>;

/**
 * The persisted gift row. Bookshelf remains the persistence implementation, but
 * values read through it are still runtime data and are validated before they
 * become trusted gift-domain values.
 */
export const DbGift = z.object({
    token: z.string(),
    buyer_email: z.string(),
    buyer_member_id: z.string().nullable(),
    buyer_name: z.string().nullable().default(null),
    delivery_method: GiftDeliveryMethodSchema.default('link'),
    recipient_email: z.string().nullable().default(null),
    recipient_name: z.string().nullable().default(null),
    personal_message: z.string().nullable().default(null),
    deliver_at: DbDate.nullable().default(null),
    delivery_status: GiftDeliveryStatusSchema.default('pending'),
    delivery_attempts: z.number().int().nonnegative().default(0),
    delivery_attempt_at: DbDate.nullable().default(null),
    email_sent_at: DbDate.nullable().default(null),
    email_provider_message_id: z.string().nullable().default(null),
    delivery_outcome: GiftDeliveryOutcomeSchema.default('unknown'),
    delivery_outcome_at: DbDate.nullable().default(null),
    delivery_outcome_diagnostics: z.string().nullable().default(null),
    redeemer_member_id: z.string().nullable(),
    tier_id: z.string(),
    cadence: GiftCadenceSchema,
    duration: z.number().int().nonnegative(),
    currency: z.string(),
    amount: z.number().int().nonnegative(),
    stripe_checkout_session_id: z.string(),
    stripe_payment_intent_id: z.string(),
    consumes_at: DbDate.nullable(),
    expires_at: DbDate,
    status: GiftStatusSchema,
    purchased_at: DbDate,
    redeemed_at: DbDate.nullable(),
    consumed_at: DbDate.nullable(),
    expired_at: DbDate.nullable(),
    refunded_at: DbDate.nullable(),
    consumes_soon_reminder_sent_at: DbDate.nullable().default(null)
});

export type GiftRow = z.output<typeof DbGift>;
export type GiftData = CamelKeys<GiftRow>;
