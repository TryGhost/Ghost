import { formatGiftValue } from '../../src/utils/format-gift-value';

describe('formatGiftValue', () => {
  test.each([
    { locale: 'de-CH', amount: 690, expected: 'CHF6.90' },
    { locale: 'de-DE', amount: 690, expected: 'CHF6,90' },
    { locale: 'de-DE', amount: 123490, expected: 'CHF1.234,90' },
    { locale: 'de-CH', amount: 600, expected: 'CHF6' },
    { locale: 'de-CH', amount: 0, expected: 'CHF0' },
  ])('formats $amount cents for $locale', ({ locale, amount, expected }) => {
    expect(formatGiftValue({ amount, currency: 'CHF' }, locale)).toBe(expected);
  });

  test('uses the browser locale when no site locale is supplied', () => {
    const expected = (6.9).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    expect(formatGiftValue({ amount: 690, currency: 'CHF' })).toBe(`CHF${expected}`);
  });

  test.each([
    undefined,
    null,
    {},
    { currency: 'CHF' },
    { amount: 690 },
    { amount: null, currency: 'CHF' },
  ])('returns an empty value for incomplete price %j', (price) => {
    expect(formatGiftValue(price, 'de-CH')).toBe('');
  });
});
