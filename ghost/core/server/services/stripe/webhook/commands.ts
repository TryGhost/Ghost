import { recordInvoicePayment, type InvoiceDeps } from '../services/webhook/invoice';
import { recordRefund, type RefundDeps } from '../services/webhook/refund';
import { saveSubscriptionChange, type SubscriptionDeps } from '../services/webhook/subscription';
import type { WebhookCommands } from '../webhook-controller';
import type { CheckoutSessionObject } from './webhook-event';

/**
 * The checkout session event service, which still completes the Checkout sessions whose commands
 * take Stripe's session rather than a typed input.
 */
interface CheckoutSessionEventService {
  completeSubscriptionCheckout(session: CheckoutSessionObject): Promise<unknown>;
  updateCard(session: CheckoutSessionObject): Promise<unknown>;
  completeGiftPurchase(session: CheckoutSessionObject): Promise<unknown>;
  recordDonation(session: CheckoutSessionObject): Promise<unknown>;
}

/** The dependencies of each webhook command, by the kind of event the command handles. */
export interface WebhookCommandDeps {
  /** Completes each kind of Checkout session, until it's read into a typed input. */
  checkoutSessionEventService: CheckoutSessionEventService;
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
    card_update_checkout: async ({ session }) => {
      await deps.checkoutSessionEventService.updateCard(session);
      return { result: 'handled' };
    },
    gift_checkout: async ({ session }) => {
      await deps.checkoutSessionEventService.completeGiftPurchase(session);
      return { result: 'handled' };
    },
    donation_checkout: async ({ session }) => {
      await deps.checkoutSessionEventService.recordDonation(session);
      return { result: 'handled' };
    },
    subscription: (input) => saveSubscriptionChange(deps.subscription, input),
    invoice: (input) => recordInvoicePayment(deps.invoice, input),
    refund: (input) => recordRefund(deps.refund, input),
  };
}
