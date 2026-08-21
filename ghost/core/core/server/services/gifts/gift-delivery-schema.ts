import { z } from 'zod';
import { DbDate } from '../../lib/db-date';
import type { CamelKeys } from '../../lib/case-keys';

export const GiftDeliveryStatusSchema = z.enum([
  'pending',
  'sending',
  'sent',
  'failed',
  'cancelled',
]);
export const GiftDeliveryOutcomeSchema = z.enum([
  'unknown',
  'delivered',
  'temporary_failed',
  'permanent_failed',
]);

export type GiftDeliveryStatus = z.infer<typeof GiftDeliveryStatusSchema>;
export type GiftDeliveryOutcome = z.infer<typeof GiftDeliveryOutcomeSchema>;

export const DbGiftDelivery = z.object({
  id: z.string(),
  gift_id: z.string(),
  recipient_email: z.string().email(),
  status: GiftDeliveryStatusSchema.default('pending'),
  started_at: DbDate.nullable().default(null),
  email_sent_at: DbDate.nullable().default(null),
  email_provider_message_id: z.string().nullable().default(null),
  outcome: GiftDeliveryOutcomeSchema.default('unknown'),
  outcome_at: DbDate.nullable().default(null),
  outcome_error: z.string().nullable().default(null),
});

export type GiftDeliveryRow = z.output<typeof DbGiftDelivery>;
export type GiftDeliveryData = CamelKeys<GiftDeliveryRow>;
