import { describe, it, assert } from 'vitest';
import { CHECKOUT_PART_SETTINGS } from '../src/index.ts';

const TIER = 'ffffffffffffffffffffffff';
const OTHER_TIER = 'fffffffffffffffffffffffe';

/** Shipping switched on, saved into custom fields, with any of its options given. */
const shippingOn = (options: Record<string, unknown>) =>
  CHECKOUT_PART_SETTINGS.shipping.safeParse({
    collect: true,
    address: { custom_field_key: 'delivery_address' },
    name: { custom_field_key: 'recipient_name' },
    ...options,
  });

describe('collected part settings', function () {
  it('keeps each named tier and country once, whatever case a country is given in', function () {
    const shipping = CHECKOUT_PART_SETTINGS.shipping.parse({
      collect: true,
      tier_ids: [TIER, OTHER_TIER, TIER],
      allowed_countries: ['gb', ' IE ', 'GB'],
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
    });

    if (!shipping.collect) {
      assert.fail('Shipping was read as switched off');
    }
    assert.deepEqual(shipping.tier_ids, [TIER, OTHER_TIER]);
    assert.deepEqual(shipping.allowed_countries, ['GB', 'IE']);
  });

  it('refuses an empty list, as a publisher who cleared one meant neither every tier nor everywhere', function () {
    assert.equal(
      CHECKOUT_PART_SETTINGS.tax_number.safeParse({ collect: true, tier_ids: [] }).success,
      false,
    );
    assert.equal(shippingOn({ allowed_countries: [] }).success, false);
  });

  it('refuses a country Stripe does not ship to', function () {
    assert.equal(shippingOn({ allowed_countries: ['GB'] }).success, true);
    assert.equal(shippingOn({ allowed_countries: ['UK'] }).success, false);
  });

  it('names no custom field for a tax ID, as Stripe keeps it', function () {
    assert.equal(
      CHECKOUT_PART_SETTINGS.tax_number.safeParse({ collect: true, custom_field_key: 'vat' })
        .success,
      false,
    );
  });
});
