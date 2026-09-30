import { describe, expect, test } from 'vitest';
import { formatGiftValue } from '../../../src/utils/format-gift-value';

describe('formatGiftValue', () => {
  test('formats fractional amount with two decimal places and currency symbol', () => {
    expect(formatGiftValue({ amount: 690, currency: 'CHF' })).toBe('CHF6.90');
  });

  test('formats integer amount without decimal padding', () => {
    expect(formatGiftValue({ amount: 500, currency: 'USD' })).toBe('$5');
  });

  test('supports locale formatting', () => {
    expect(formatGiftValue({ amount: 690, currency: 'CHF' }, 'de')).toBe('CHF6,90');
  });

  test('returns empty string for missing or invalid input', () => {
    expect(formatGiftValue(null)).toBe('');
    expect(formatGiftValue(undefined)).toBe('');
    expect(formatGiftValue({})).toBe('');
    expect(formatGiftValue({ amount: null, currency: 'USD' })).toBe('');
    expect(formatGiftValue({ amount: undefined, currency: 'USD' })).toBe('');
    expect(formatGiftValue({ amount: 500, currency: null })).toBe('');
    expect(formatGiftValue({ amount: 500, currency: '' })).toBe('');
  });
});
