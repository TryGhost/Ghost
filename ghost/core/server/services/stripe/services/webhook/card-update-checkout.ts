import type { StripeSetupIntent, SubscriptionReference } from '../../stripe-api-responses';
import type { CheckoutCompletionAttempt, StripeTracking, WebhookOutcome } from '../../tracking';
import type { CardUpdateCheckout } from '../../webhook/webhook-event';
import { linkOrConflict, type SubscriptionLinks } from './link-subscription';

/** A subscription Ghost saved for a member, which a card update reads to find whose card to replace. */
interface SavedSubscription {
  get(attribute: 'subscription_id' | 'customer_id' | 'status'): string;
}

interface Member {
  id: string;
  related(relation: 'stripeSubscriptions'): {
    fetch(): Promise<{ models: SavedSubscription[] }>;
  };
}

export interface CardUpdateCheckoutDeps {
  api: {
    getSetupIntent(id: string): Promise<StripeSetupIntent>;
    attachPaymentMethodToCustomer(customerId: string, paymentMethodId: string): Promise<unknown>;
    updateSubscriptionDefaultPaymentMethod(
      subscriptionId: string,
      paymentMethodId: string,
    ): Promise<SubscriptionReference>;
  };
  memberRepository: SubscriptionLinks & {
    get(filter: { customer_id: string }): Promise<Member | null>;
  };
  tracking: Pick<StripeTracking, 'checkoutCompletion'>;
}

/**
 * The statuses of a subscription Stripe still charges, whose card a card update replaces. Stripe
 * treats a canceled subscription as gone and refuses to change it.
 */
const CHARGED_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'unpaid', 'past_due']);

/**
 * Completes a Checkout session in `setup` mode, which a member opens to add a new card for their
 * subscriptions, by attaching the member's new card to their Stripe customer and making it the
 * payment method of each subscription that customer pays for. A setup intent Ghost didn't create
 * names no customer, so it's ignored, and one whose customer isn't a member's is left alone.
 * Records a `stripe_checkout.complete` span, which has the `setup` type only once the setup intent
 * names a customer, so an ignored one isn't counted as a completed checkout.
 */
export async function updateCard(
  deps: CardUpdateCheckoutDeps,
  { setupIntentId }: CardUpdateCheckout,
): Promise<WebhookOutcome> {
  return deps.tracking.checkoutCompletion((attempt) => saveNewCard(deps, setupIntentId, attempt));
}

async function saveNewCard(
  deps: Pick<CardUpdateCheckoutDeps, 'api' | 'memberRepository'>,
  setupIntentId: string,
  attempt: CheckoutCompletionAttempt,
): Promise<WebhookOutcome> {
  const { api, memberRepository } = deps;
  const setupIntent = await api.getSetupIntent(setupIntentId);
  const { customer_id: customerId, subscription_id: subscriptionId } = setupIntent.metadata;
  if (!customerId) {
    return { result: 'ignored', reason: 'not_a_ghost_checkout' };
  }
  attempt.completing('setup');
  const member = await memberRepository.get({ customer_id: customerId });
  if (!member) {
    return { result: 'handled' };
  }

  const paymentMethod = setupIntent.payment_method;
  await api.attachPaymentMethodToCustomer(customerId, paymentMethod);

  // Setup intents from older Ghost versions name the one subscription the card is for.
  if (subscriptionId) {
    await payWith(deps, member, subscriptionId, paymentMethod);
    return { result: 'handled' };
  }
  const subscriptions = await member.related('stripeSubscriptions').fetch();
  for (const subscription of subscriptions.models) {
    if (
      CHARGED_STATUSES.has(subscription.get('status')) &&
      subscription.get('customer_id') === customerId
    ) {
      await payWith(deps, member, subscription.get('subscription_id'), paymentMethod);
    }
  }
  return { result: 'handled' };
}

/** Makes the card the subscription's payment method on Stripe, and saves the subscription. */
async function payWith(
  deps: Pick<CardUpdateCheckoutDeps, 'api' | 'memberRepository'>,
  member: Member,
  subscriptionId: string,
  paymentMethod: string,
) {
  const { api, memberRepository } = deps;
  const subscription = await api.updateSubscriptionDefaultPaymentMethod(
    subscriptionId,
    paymentMethod,
  );
  await linkOrConflict(memberRepository, { id: member.id, subscription });
}
