import logging from '@tryghost/logging';
import type { WebhookOutcome } from '../../tracking';
import type { Refund } from '../../webhook/webhook-event';

export interface RefundDeps {
  giftService: { handlePaymentRefund(data: { paymentIntentId: string }): Promise<boolean> };
}

/**
 * Handles a `charge.refunded` webhook event, which Stripe sends when a charge is refunded, by
 * marking the gift bought with the refunded payment as refunded. Gifts are the only purchases Ghost
 * acts on a refund of, so a charge without a payment intent, or one that isn't for a gift, such as
 * a subscription renewal or a donation, is left alone.
 */
export async function recordRefund(
  deps: RefundDeps,
  { paymentIntentId }: Refund,
): Promise<WebhookOutcome> {
  if (!paymentIntentId) {
    logging.info('charge.refunded: no payment_intent on charge, skipping');
    return { result: 'handled' };
  }

  const refunded = await deps.giftService.handlePaymentRefund({ paymentIntentId });
  if (!refunded) {
    logging.info(`charge.refunded: no gift found for payment_intent ${paymentIntentId}, skipping`);
  }
  return { result: 'handled' };
}
