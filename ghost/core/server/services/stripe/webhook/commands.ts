import { updateCard, type CardUpdateCheckoutDeps } from '../services/webhook/card-update-checkout';
import { recordDonation, type DonationCheckoutDeps } from '../services/webhook/donation-checkout';
import { completeGiftPurchase, type GiftCheckoutDeps } from '../services/webhook/gift-checkout';
import { recordInvoicePayment, type InvoiceDeps } from '../services/webhook/invoice';
import { recordRefund, type RefundDeps } from '../services/webhook/refund';
import { saveSubscriptionChange, type SubscriptionDeps } from '../services/webhook/subscription';
import type { WebhookCommands } from '../webhook-controller';
import type { CheckoutSessionObject } from './webhook-event';

/**
 * The checkout session event service, which still completes the one Checkout session whose command
 * takes Stripe's session rather than a typed input.
 */
interface CheckoutSessionEventService {
  completeSubscriptionCheckout(session: CheckoutSessionObject): Promise<unknown>;
}

/** The dependencies of each webhook command, by the kind of event the command handles. */
export interface WebhookCommandDeps {
  /** Completes the subscription checkouts, until they're read into a typed input. */
  checkoutSessionEventService: CheckoutSessionEventService;
  card_update_checkout: CardUpdateCheckoutDeps;
  gift_checkout: GiftCheckoutDeps;
  donation_checkout: DonationCheckoutDeps;
  subscription: SubscriptionDeps;
  invoice: InvoiceDeps;
  refund: RefundDeps;
}

/**
 * The webhook's command for each kind of event Ghost acts on, given its dependencies. Each command
 * reads its dependencies only as it handles an event, never while the table is built, as the
 * Stripe service's getters resolve only once their services have started.
 */
export function webhookCommands(deps: WebhookCommandDeps): WebhookCommands {
  return {
    subscription_checkout: async ({ session }) => {
      await deps.checkoutSessionEventService.completeSubscriptionCheckout(session);
      return { result: 'handled' };
    },
    card_update_checkout: (input) => updateCard(deps.card_update_checkout, input),
    gift_checkout: (input) => completeGiftPurchase(deps.gift_checkout, input),
    donation_checkout: (input) => recordDonation(deps.donation_checkout, input),
    subscription: (input) => saveSubscriptionChange(deps.subscription, input),
    invoice: (input) => recordInvoicePayment(deps.invoice, input),
    refund: (input) => recordRefund(deps.refund, input),
  };
}
