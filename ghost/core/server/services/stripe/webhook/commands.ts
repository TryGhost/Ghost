import { updateCard, type CardUpdateCheckoutDeps } from '../services/webhook/card-update-checkout';
import { recordDonation, type DonationCheckoutDeps } from '../services/webhook/donation-checkout';
import { completeGiftPurchase, type GiftCheckoutDeps } from '../services/webhook/gift-checkout';
import { recordInvoicePayment, type InvoiceDeps } from '../services/webhook/invoice';
import { recordRefund, type RefundDeps } from '../services/webhook/refund';
import { saveSubscriptionChange, type SubscriptionDeps } from '../services/webhook/subscription';
import {
  completeSubscriptionCheckout,
  type SubscriptionCheckoutDeps,
} from '../services/webhook/subscription-checkout';
import type { WebhookCommands } from '../webhook-controller';

/** The dependencies of each webhook command, by the kind of event the command handles. */
export interface WebhookCommandDeps {
  subscription_checkout: SubscriptionCheckoutDeps;
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
    subscription_checkout: (input) =>
      completeSubscriptionCheckout(deps.subscription_checkout, input),
    card_update_checkout: (input) => updateCard(deps.card_update_checkout, input),
    gift_checkout: (input) => completeGiftPurchase(deps.gift_checkout, input),
    donation_checkout: (input) => recordDonation(deps.donation_checkout, input),
    subscription: (input) => saveSubscriptionChange(deps.subscription, input),
    invoice: (input) => recordInvoicePayment(deps.invoice, input),
    refund: (input) => recordRefund(deps.refund, input),
  };
}
