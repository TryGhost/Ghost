import {
  MAX_RETENTION_OFFER_NAME_LENGTH,
  generateRetentionOfferName,
  getOfferDiscount,
} from '@/settings/growth/offers/offer-helpers';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';

describe('generateRetentionOfferName', function () {
  it('keeps the full 8-character hash when the preferred wording fits', function () {
    const name = generateRetentionOfferName(
      {
        amount: 35,
        duration: 'forever',
        durationInMonths: 0,
      },
      'deadbeef',
    );

    expect(name).toBe('Retention 35% off forever (deadbeef)');
  });

  it('handles once offers', function () {
    const name = generateRetentionOfferName(
      {
        amount: 10,
        duration: 'once',
        durationInMonths: 0,
      },
      'deadbeef',
    );

    expect(name).toBe('Retention 10% off once (deadbeef)');
  });

  it('handles repeating offers', function () {
    const name = generateRetentionOfferName(
      {
        amount: 25,
        duration: 'repeating',
        durationInMonths: 2,
      },
      'deadbeef',
    );

    expect(name).toBe('Retention 25% off for 2 mo (deadbeef)');
  });

  it('handles free months offers', function () {
    const name = generateRetentionOfferName(
      {
        amount: 100,
        duration: 'repeating',
        durationInMonths: 3,
      },
      'deadbeef',
    );

    expect(name).toBe('Retention 3 months free (deadbeef)');
  });

  it('keeps the full hash at the maximum validated month count', function () {
    const name = generateRetentionOfferName(
      {
        amount: 99,
        duration: 'repeating',
        durationInMonths: 99,
      },
      'deadbeef',
    );

    expect(name).toBe('Retention 99% off for 99 mo (deadbeef)');
    expect(name.length <= MAX_RETENTION_OFFER_NAME_LENGTH).toBe(true);
    expect(name.endsWith('(deadbeef)')).toBe(true);
  });

  it('truncates the hash when the full name would exceed 40 characters', function () {
    const name = generateRetentionOfferName(
      {
        amount: 99,
        duration: 'repeating',
        durationInMonths: 99,
      },
      'deadbeefcafebabe',
    );

    expect(name).toBe('Retention 99% off for 99 mo (deadbeefca)');
    expect(name.length).toBe(MAX_RETENTION_OFFER_NAME_LENGTH);
  });
});

describe('getOfferDiscount', function () {
  const tier = { monthly_price: 990, yearly_price: 9900 } as Tier;

  it('keeps two decimals on prices with cents', function () {
    expect(getOfferDiscount('fixed', 150, 'month', 'usd', tier)).toEqual({
      discountOffer: '1.50 usd off',
      originalPriceWithCurrency: '$9.90',
      updatedPriceWithCurrency: '$8.40',
    });
  });

  it('shows whole prices without decimals', function () {
    expect(getOfferDiscount('fixed', 900, 'year', 'usd', tier)).toEqual({
      discountOffer: '9 usd off',
      originalPriceWithCurrency: '$99',
      updatedPriceWithCurrency: '$90',
    });
  });

  it('rounds percent discounts the way Portal does', function () {
    // 15% off $9.90: Portal rounds the $1.485 discount to $1.49
    expect(getOfferDiscount('percent', 15, 'month', 'usd', tier).updatedPriceWithCurrency).toBe(
      '$8.41',
    );
  });
});
