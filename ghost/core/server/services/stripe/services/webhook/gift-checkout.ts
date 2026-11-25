import type { GiftPaymentCompletion } from '../../../gifts/gift-service';
import type { StripeTracking, WebhookOutcome } from '../../tracking';
import type { GiftCheckout } from '../../webhook/webhook-event';

export interface GiftCheckoutDeps {
  giftService: { completePurchase(completion: GiftPaymentCompletion): Promise<boolean> };
  tracking: Pick<StripeTracking, 'checkoutCompletion'>;
}

/**
 * Completes a gift purchase's Checkout session once Stripe has received the payment, by marking
 * the gift Ghost recorded when the buyer started the checkout as purchased. Records a
 * `stripe_checkout.complete` span.
 */
export async function completeGiftPurchase(
  deps: GiftCheckoutDeps,
  { giftId, sessionId, paymentIntentId, customerId, buyerEmail }: GiftCheckout,
): Promise<WebhookOutcome> {
  return deps.tracking.checkoutCompletion(async (attempt) => {
    attempt.completing('gift');
    await deps.giftService.completePurchase({
      giftId,
      buyerEmail,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
    });
    return { result: 'handled' };
  });
}
