import { describe, it, assert } from 'vitest';
import {
  toWebhookEvent,
  type CheckoutSessionEventType,
  type WebhookEvent,
} from '../../../../../../core/server/services/stripe/webhook/webhook-event';

/** The site that reads each event, which ignores no customers. */
const thisSite = {
  siteUuid: '9b6c2f7e-2f0e-4c55-9d0a-1f4e3b7c6a11',
  listedCustomers: new Set<string>(),
};

/**
 * The fields of a Checkout session that the command for each kind reads, as Stripe sends them on
 * every session, so each case sets only the fields that decide its kind.
 */
const SESSION = {
  id: 'cs_1',
  customer: null,
  customer_details: { name: 'A buyer', email: 'buyer@example.com' },
  amount_total: 500,
  currency: 'usd',
  payment_intent: 'pi_1',
  setup_intent: 'seti_1',
  metadata: {},
};

/** The webhook event for a Checkout session event of `type` carrying `session`. */
function checkout(type: CheckoutSessionEventType, session: Record<string, unknown>): WebhookEvent {
  return toWebhookEvent(type, { type, data: { object: { ...SESSION, ...session } } }, thisSite);
}

const COMPLETED = 'checkout.session.completed';
const PAID_LATER = 'checkout.session.async_payment_succeeded';
const PAYMENT_FAILED = 'checkout.session.async_payment_failed';

describe('Stripe webhook events', function () {
  describe('Checkout sessions', function () {
    const cases: {
      name: string;
      type: CheckoutSessionEventType;
      session: Record<string, unknown>;
      expected: string;
    }[] = [
      {
        name: 'a card update',
        type: COMPLETED,
        session: { mode: 'setup' },
        expected: 'card_update_checkout',
      },
      {
        name: 'a paid signup or upgrade',
        type: COMPLETED,
        session: { mode: 'subscription' },
        expected: 'subscription_checkout',
      },
      {
        name: 'a donation, marked with true',
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_donation: true } },
        expected: 'donation_checkout',
      },
      {
        name: "a donation, marked with 'true'",
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_donation: 'true' } },
        expected: 'donation_checkout',
      },
      {
        name: "a payment marked with ghost_donation 'false'",
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_donation: 'false' } },
        expected: 'not_a_ghost_checkout',
      },
      {
        name: 'a paid gift marked with its gift id',
        type: COMPLETED,
        session: { mode: 'payment', payment_status: 'paid', metadata: { ghost_gift_id: 'gift_1' } },
        expected: 'gift_checkout',
      },
      {
        name: 'a gift Stripe has not been paid for yet',
        type: COMPLETED,
        session: {
          mode: 'payment',
          payment_status: 'unpaid',
          metadata: { ghost_gift_id: 'gift_1' },
        },
        expected: 'gift_not_paid',
      },
      {
        name: 'an unpaid gift marked only with the marker Ghost wrote before gift ids',
        type: COMPLETED,
        session: { mode: 'payment', payment_status: 'unpaid', metadata: { ghost_gift: 'true' } },
        expected: 'gift_not_paid',
      },
      {
        name: 'a gift whose delayed payment arrived',
        type: PAID_LATER,
        session: { mode: 'payment', payment_status: 'paid', metadata: { ghost_gift_id: 'gift_1' } },
        expected: 'gift_checkout',
      },
      {
        name: 'a delayed payment Stripe still reports as unpaid',
        type: PAID_LATER,
        session: {
          mode: 'payment',
          payment_status: 'unpaid',
          metadata: { ghost_gift_id: 'gift_1' },
        },
        expected: 'gift_not_paid',
      },
      {
        name: 'a donation whose delayed payment arrived, which only gifts wait for',
        type: PAID_LATER,
        session: { mode: 'payment', payment_status: 'paid', metadata: { ghost_donation: 'true' } },
        expected: 'not_a_gift',
      },
      {
        name: 'a failed delayed payment',
        type: PAYMENT_FAILED,
        session: { mode: 'payment', metadata: { ghost_gift_id: 'gift_1' } },
        expected: 'payment_failed',
      },
      {
        name: "a payment marked with ghost_gift 'false'",
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_gift: 'false' } },
        expected: 'not_a_ghost_checkout',
      },
      {
        name: 'a payment marked as a gift and with an empty donation marker',
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_donation: '', ghost_gift: 'true' } },
        expected: 'conflicting_checkout_markers',
      },
      {
        name: 'a payment marked as both a gift and a donation',
        type: COMPLETED,
        session: { mode: 'payment', metadata: { ghost_donation: true, ghost_gift_id: 'gift_1' } },
        expected: 'conflicting_checkout_markers',
      },
      {
        name: 'a paid gift and donation whose delayed payment arrived',
        type: PAID_LATER,
        session: {
          mode: 'payment',
          payment_status: 'paid',
          metadata: { ghost_donation: 'true', ghost_gift_id: 'gift_1' },
        },
        expected: 'conflicting_checkout_markers',
      },
      {
        name: 'a payment without Ghost’s markers, such as a Payment Link sale',
        type: COMPLETED,
        session: { mode: 'payment', payment_status: 'paid', metadata: {} },
        expected: 'not_a_ghost_checkout',
      },
      {
        name: 'a session in a mode Ghost doesn’t create',
        type: COMPLETED,
        session: { mode: 'unsupported_mode' },
        expected: 'not_a_ghost_checkout',
      },
    ];

    for (const { name, type, session, expected } of cases) {
      it(`reads ${name} as ${expected}`, function () {
        const event = checkout(type, session);
        assert.equal(event.kind === 'ignored' ? event.reason : event.kind, expected);
      });
    }
  });

  it('reads an event type Ghost has no command for as ignored', function () {
    assert.deepEqual(
      toWebhookEvent('product.created', { type: 'product.created', data: {} }, thisSite),
      {
        kind: 'ignored',
        reason: 'unhandled_type',
      },
    );
  });
});
