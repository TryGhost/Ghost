import type {OptionalKeysOf, SetOptional} from 'type-fest';
import {z} from 'zod';
import {DbDate} from '../../lib/db-date';
import type {CamelKeys} from '../../lib/case-keys';

export const GiftCadenceSchema = z.enum(['month', 'year']);
export const GiftStatusSchema = z.enum(['payment_pending', 'purchased', 'redeemed', 'consumed', 'expired', 'refunded']);
export type GiftCadence = z.infer<typeof GiftCadenceSchema>;
export type GiftStatus = z.infer<typeof GiftStatusSchema>;

/**
 * The persisted gift row. Bookshelf remains the persistence implementation, but
 * values read through it are still runtime data and are validated before they
 * become trusted gift-domain values.
 */
export const DbGift = z.object({
    token: z.string(),
    buyer_email: z.string().nullable(),
    buyer_member_id: z.string().nullable(),
    buyer_name: z.string().nullable().default(null),
    recipient_name: z.string().nullable().default(null),
    personal_message: z.string().nullable().default(null),
    redeemer_member_id: z.string().nullable(),
    tier_id: z.string(),
    cadence: GiftCadenceSchema,
    duration: z.number().int().nonnegative(),
    currency: z.string(),
    amount: z.number().int().nonnegative(),
    stripe_checkout_session_id: z.string().nullable(),
    stripe_payment_intent_id: z.string().nullable(),
    checkout_started_at: DbDate.nullable().default(null),
    consumes_at: DbDate.nullable(),
    expires_at: DbDate.nullable(),
    status: GiftStatusSchema,
    purchased_at: DbDate.nullable(),
    redeemed_at: DbDate.nullable(),
    consumed_at: DbDate.nullable(),
    expired_at: DbDate.nullable(),
    refunded_at: DbDate.nullable(),
    consumes_soon_reminder_sent_at: DbDate.nullable().default(null)
});

type GiftInputRow = z.input<typeof DbGift>;
export type GiftRow = z.output<typeof DbGift>;
export type GiftData = CamelKeys<GiftRow>;
export type GiftDataInput = SetOptional<GiftData, OptionalKeysOf<CamelKeys<GiftInputRow>>>;
