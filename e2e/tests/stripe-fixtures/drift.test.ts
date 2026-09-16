import fs from 'node:fs';
import path from 'node:path';
import {
  buildCheckoutSession,
  buildCoupon,
  buildCustomer,
  buildPaymentMethod,
  buildPrice,
  buildProduct,
  buildSubscription,
} from '@/helpers/services/stripe/builders';
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../helpers/services/stripe/fixtures',
);

function fixture(name: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.resolve(fixtureDir, `${name}.json`), 'utf8'));
}

/**
 * The fake Stripe server hand-builds the objects Stripe would return. Those shapes were
 * written from the docs, not from Stripe, so nothing has ever checked them against the
 * real thing. These tests check them against fixtures captured from Stripe test mode by
 * `pnpm stripe:fixtures`.
 *
 * Two different failures are worth catching, and they need different assertions.
 *
 * A builder emitting a key Stripe does not return means the fake is describing an API
 * that does not exist, so a test can pass against a field production will never send.
 *
 * A builder omitting a key Ghost reads is the more dangerous one, because it is silent:
 * the property access yields undefined, the branch behind it never runs, and the suite
 * stays green. That is how `plan` went missing while five call sites read it.
 */
test.describe('Stripe fixtures - builder shapes match captured Stripe responses', () => {
  const cases = [
    { name: 'product', built: buildProduct(), captured: 'product' },
    { name: 'price', built: buildPrice(), captured: 'price.monthly' },
    { name: 'coupon', built: buildCoupon(), captured: 'coupon' },
    { name: 'payment method', built: buildPaymentMethod(), captured: 'payment_method' },
    {
      name: 'customer',
      built: buildCustomer({ email: 'a@b.test', name: 'A B' }),
      captured: 'customer',
    },
    {
      name: 'subscription',
      built: buildSubscription({ customerId: 'cus_x' }),
      captured: 'subscription.paid',
    },
    {
      name: 'checkout session',
      built: buildCheckoutSession().response,
      captured: 'checkout_session.subscription',
    },
  ];

  for (const { name, built, captured } of cases) {
    test(`${name} - invents no field Stripe does not return`, () => {
      const real = Object.keys(fixture(captured));
      // `subscriptions` is expanded onto the customer by the fake because Ghost always
      // requests it expanded; Stripe omits it from an unexpanded retrieve.
      const allowed = new Set([...real, 'subscriptions']);
      const invented = Object.keys(built).filter((key) => !allowed.has(key));

      expect(
        invented,
        `${name} builder emits keys Stripe does not: ${invented.join(', ')}`,
      ).toEqual([]);
    });
  }

  /**
   * Paths Ghost reads off Stripe objects, with the file that reads them.
   *
   * Checked against both the builder and the captured response, at whatever depth
   * the path goes. Against the builder because a missing path is the silent failure
   * this suite exists for. Against the fixture because a path Stripe does not
   * actually return means the entry is wrong, and a wrong entry is worse than none.
   */
  const consumed: Array<{ object: string; path: string; readAt: string }> = [
    {
      object: 'subscription',
      path: 'plan.nickname',
      readAt: 'member-repository isComplimentaryPlanNickname',
    },
    { object: 'subscription', path: 'plan.amount', readAt: 'next-payment-calculator' },
    { object: 'subscription', path: 'plan.interval', readAt: 'next-payment-calculator' },
    { object: 'subscription', path: 'plan.currency', readAt: 'next-payment-calculator' },
    { object: 'subscription', path: 'plan.product', readAt: 'invoice-event-service' },
    {
      object: 'subscription',
      path: 'status',
      readAt: 'member-repository isActiveSubscriptionStatus',
    },
    {
      object: 'subscription',
      path: 'current_period_end',
      readAt: 'member-repository linkSubscription',
    },
    {
      object: 'subscription',
      path: 'cancel_at_period_end',
      readAt: 'member-repository linkSubscription',
    },
    {
      object: 'subscription',
      path: 'items.data.0.price.id',
      readAt: 'member-repository linkSubscription',
    },
    { object: 'price', path: 'nickname', readAt: 'product-repository price sync' },
    { object: 'price', path: 'recurring.interval', readAt: 'stripe-api createPrice round trip' },
  ];

  const builtByObject: Record<string, unknown> = {
    subscription: buildSubscription({ customerId: 'cus_x' }),
    price: buildPrice(),
  };

  const capturedByObject: Record<string, string> = {
    subscription: 'subscription.paid',
    price: 'price.monthly',
  };

  function resolve(root: unknown, fieldPath: string): unknown {
    return fieldPath.split('.').reduce<unknown>((value, segment) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return (value as Record<string, unknown>)[segment];
    }, root);
  }

  for (const { object, path: fieldPath, readAt } of consumed) {
    test(`${object}.${fieldPath} - built and captured, read by ${readAt}`, () => {
      expect(
        resolve(builtByObject[object], fieldPath),
        `builder omits ${object}.${fieldPath}`,
      ).not.toBeUndefined();
      expect(
        resolve(fixture(capturedByObject[object]), fieldPath),
        `Stripe does not return ${object}.${fieldPath}, so this entry is wrong`,
      ).not.toBeUndefined();
    });
  }
});

/**
 * A completed Checkout Session, captured by hand via `pnpm stripe:fixtures:checkout`.
 * These assertions pin the shapes BER-3872 reads, so that a re-capture showing Stripe
 * has moved any of them fails here rather than in production.
 *
 * The version matters. Ghost pins its webhook endpoint to the same API version its
 * client uses, so it receives this rendering. At Stripe's current default the shipping
 * address has moved to `collected_information.shipping_details`, which Ghost will not
 * see until that pin changes.
 */
test.describe('Stripe fixtures - completed checkout carries what we read', () => {
  const completed = fixture('checkout_session.completed') as {
    shipping?: { name?: string; address?: Record<string, unknown> };
    customer_details?: { tax_ids?: Array<{ type: string; value: string }> };
    custom_fields?: Array<{ key: string; text?: { value?: string } }>;
  };

  test('shipping carries a recipient name distinct from the address', () => {
    // The reason the address field type needs a name part: Stripe collects one, and
    // a delivery name is often not the account name.
    expect(completed.shipping?.name).toEqual(expect.any(String));
  });

  test('shipping address parts match the ones our address type declares', () => {
    expect(Object.keys(completed.shipping?.address ?? {}).sort()).toEqual([
      'city',
      'country',
      'line1',
      'line2',
      'postal_code',
      'state',
    ]);
  });

  test('a tax ID arrives as a typed pair, so only the value should cross', () => {
    // `type` is a Stripe enum (gb_vat, eu_vat, us_ein). Letting it reach a publisher
    // field would put Stripe vocabulary into publisher-owned data.
    expect(completed.customer_details?.tax_ids?.[0]).toEqual({
      type: expect.any(String),
      value: expect.any(String),
    });
  });

  test('a custom field answer arrives under text.value, keyed by the key we sent', () => {
    const field = completed.custom_fields?.find((candidate) => candidate.key === 'delivery_notes');

    expect(field?.text?.value).toEqual(expect.any(String));
  });
});
