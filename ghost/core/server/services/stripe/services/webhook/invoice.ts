import errors from '@tryghost/errors';
import type { StripeSubscription } from '../../stripe-api-responses';
import type { WebhookOutcome } from '../../tracking';
import { FAILURE_CODES } from '../../webhook/failures';
import type { Invoice } from '../../webhook/webhook-event';

export interface InvoiceDeps {
  api: { getSubscription(id: string): Promise<StripeSubscription> };
  memberRepository: { get(filter: { customer_id: string }): Promise<{ id: string } | null> };
  eventRepository: {
    registerPayment(payment: {
      member_id: string;
      currency: string;
      amount: number;
    }): Promise<unknown>;
  };
  productRepository: { get(filter: { stripe_product_id: string }): Promise<unknown> };
}

/**
 * Handles an `invoice.payment_succeeded` webhook event, which Stripe sends when a customer's
 * payment succeeds, by recording the payment for a subscription's invoice on the activity of the
 * member whose Stripe customer paid it. A $0 invoice, such as the start of a trial, records no
 * payment. A one-off invoice, such as a donation's, is recorded by its checkout instead, which
 * carries the donation's message.
 */
export async function recordInvoicePayment(
  deps: InvoiceDeps,
  { subscriptionId, amountPaid, currency }: Invoice,
): Promise<WebhookOutcome> {
  if (!subscriptionId) {
    return { result: 'handled' };
  }
  const { api, memberRepository, eventRepository, productRepository } = deps;
  const subscription = await api.getSubscription(subscriptionId);

  const member = await memberRepository.get({ customer_id: subscription.customer });
  if (member) {
    if (amountPaid !== 0) {
      await eventRepository.registerPayment({
        member_id: member.id,
        currency,
        amount: amountPaid,
      });
    }
    return { result: 'handled' };
  }

  // A subscription with more than one price wasn't created by Ghost.
  if (!subscription.plan) {
    return { result: 'handled' };
  }
  // A subscription to another product isn't one of the site's tiers.
  const product = await productRepository.get({ stripe_product_id: subscription.plan.product });
  if (!product) {
    return { result: 'handled' };
  }
  // Ghost records the payment against a member, and no member has this customer.
  throw new errors.NotFoundError({
    code: FAILURE_CODES.noMemberForCustomer,
    message: `No member found for customer ${subscription.customer}`,
  });
}
