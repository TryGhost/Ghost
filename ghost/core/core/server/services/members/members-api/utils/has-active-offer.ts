import { getDiscountWindow } from './get-discount-window';
import { type OfferDTO } from '../../../offers/application/offer-mapper';

type SubscriptionModel = {
  get(key: 'discount_start' | 'discount_end' | 'trial_end_at'): null | Date;
  get(key: 'start_date' | 'current_period_end'): Date;
  get(key: 'offer_id'): null | string;
};

/**
 * Determines if a subscription has an offer that still affects the next payment, or an active trial. Uses
 * discount_start/discount_end (synced from Stripe) when available, falls back to offer duration lookup for legacy data
 * (pre-6.16).
 *
 * @param subscriptionModel Bookshelf model for members_stripe_customers_subscriptions
 * @param offersAPI OffersAPI instance with getOffer()
 * @param [options] Optional query options such as transacting
 */
export async function hasActiveOffer(
  subscriptionModel: SubscriptionModel,
  offersAPI: { getOffer: (data: { id: string }, options?: unknown) => Promise<OfferDTO> },
  options = {},
): Promise<boolean> {
  const subscriptionData = {
    discount_start: subscriptionModel.get('discount_start'),
    discount_end: subscriptionModel.get('discount_end'),
    start_date: subscriptionModel.get('start_date'),
    current_period_end: subscriptionModel.get('current_period_end'),
  };

  // Check for active trial
  const trialEndAt = subscriptionModel.get('trial_end_at');
  if (trialEndAt && new Date(trialEndAt) > new Date()) {
    return true;
  }

  // Check for active offer
  const offerId = subscriptionModel.get('offer_id');
  if (!offerId) {
    return false;
  }

  // Look up the offer to determine if it's still active based on duration
  try {
    const offer = await offersAPI.getOffer({ id: offerId }, options);
    if (!offer) {
      return false;
    }

    const discountWindow = getDiscountWindow(subscriptionData, offer);
    if (discountWindow) {
      return !discountWindow.end || new Date(discountWindow.end) > new Date();
    }

    return false;
  } catch (e) {
    // If we can't look up the offer, err on the side of blocking
    return true;
  }
}
