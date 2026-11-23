import { formatCurrency, formatCurrencyAmount, getSymbol } from '../../../src/utils/currency';

describe('currency utils', () => {
  describe('getSymbol', () => {
    it('returns correct symbols for common currencies', () => {
      expect(getSymbol('USD')).toBe('$');
      expect(getSymbol('EUR')).toBe('€');
      expect(getSymbol('GBP')).toBe('£');
      expect(getSymbol('JPY')).toBe('¥');
      expect(getSymbol('CNY')).toBe('CN¥');
      expect(getSymbol('AUD')).toBe('A$');
      expect(getSymbol('CAD')).toBe('CA$');
      expect(getSymbol('CHF')).toBe('CHF');
      expect(getSymbol('SEK')).toBe('SEK');
      expect(getSymbol('NZD')).toBe('NZ$');
    });

    it('returns empty string for empty input', () => {
      expect(getSymbol('')).toBe('');
    });

    it('returns empty string for null/undefined input', () => {
      expect(getSymbol(null as any)).toBe('');
      expect(getSymbol(undefined as any)).toBe('');
    });

    it('handles uncommon but valid currency codes', () => {
      expect(getSymbol('INR')).toBe('₹');
      expect(getSymbol('RUB')).toBe('RUB');
      expect(getSymbol('BRL')).toBe('R$');
      expect(getSymbol('ZAR')).toBe('ZAR');
      expect(getSymbol('MXN')).toBe('MX$');
      expect(getSymbol('SGD')).toBe('SGD');
      expect(getSymbol('HKD')).toBe('HK$');
      expect(getSymbol('NOK')).toBe('NOK');
      expect(getSymbol('KRW')).toBe('₩');
      expect(getSymbol('TRY')).toBe('TRY');
    });

    it('returns generic currency symbol for invalid/unknown currency codes', () => {
      expect(getSymbol('XXX')).toBe('¤');
      expect(() => getSymbol('INVALID')).toThrow('Invalid currency code');
      expect(() => getSymbol('123')).toThrow('Invalid currency code');
    });

    it('handles lowercase currency codes', () => {
      expect(getSymbol('usd')).toBe('$');
      expect(getSymbol('eur')).toBe('€');
      expect(getSymbol('gbp')).toBe('£');
    });

    it('throws error for invalid currency codes with special characters', () => {
      expect(() => getSymbol('US$')).toThrow('Invalid currency code');
      expect(() => getSymbol('€UR')).toThrow('Invalid currency code');
    });

    it('removes numbers and decimal points from formatted output', () => {
      const result = getSymbol('USD');
      expect(result).not.toMatch(/\d/);
      expect(result).not.toContain('.');
      expect(result).not.toContain('0');
    });

    it('throws error for currency codes with spaces', () => {
      expect(() => getSymbol(' USD ')).toThrow('Invalid currency code');
      expect(() => getSymbol('U SD')).toThrow('Invalid currency code');
    });
  });

  describe('formatCurrencyAmount', () => {
    it('formats whole amounts without decimals', () => {
      expect(formatCurrencyAmount(500)).toBe('5');
      expect(formatCurrencyAmount(0)).toBe('0');
    });

    it('keeps two decimals when an amount has cents', () => {
      expect(formatCurrencyAmount(990)).toBe('9.90');
      expect(formatCurrencyAmount(150)).toBe('1.50');
      expect(formatCurrencyAmount(499)).toBe('4.99');
    });

    it('rounds fractional cents before choosing decimals', () => {
      expect(formatCurrencyAmount(999.6)).toBe('10');
      expect(formatCurrencyAmount(849.15)).toBe('8.49');
    });

    it('uses the given locale for separators', () => {
      expect(formatCurrencyAmount(123450, { locale: 'en-US' })).toBe('1,234.50');
      expect(formatCurrencyAmount(123450, { locale: 'de-DE' })).toBe('1.234,50');
    });

    it('defaults to en-US separators', () => {
      expect(formatCurrencyAmount(1000000)).toBe('10,000');
      expect(formatCurrencyAmount(1234567)).toBe('12,345.67');
    });
  });

  describe('formatCurrency', () => {
    it('puts the currency symbol in front of the amount', () => {
      expect(formatCurrency(500, 'usd')).toBe('$5');
      expect(formatCurrency(1000, 'eur')).toBe('€10');
      expect(formatCurrency(990, 'usd')).toBe('$9.90');
      expect(formatCurrency(123450, 'gbp', { locale: 'en-US' })).toBe('£1,234.50');
    });
  });
});
