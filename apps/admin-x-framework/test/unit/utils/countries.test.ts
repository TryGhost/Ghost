import { describe, expect, it } from 'vitest';
import { countryName, countryOptions } from '../../../src/utils/countries';

// Names are the browser's own locale data and shift a little between engine versions,
// so these pin what must hold rather than exact wording.
describe('countries', () => {
  it('names every country a picker offers, each one differently', () => {
    const labels = countryOptions().map((option) => option.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(countryOptions().every((option) => option.label !== option.value)).toBe(true);
  });

  it('tells the two Congos apart', () => {
    expect(countryName('CG')).toContain('Congo');
    expect(countryName('CD')).toContain('Congo');
    expect(countryName('CG')).not.toBe(countryName('CD'));
  });

  it('names a code whatever its case', () => {
    expect(countryName('de')).toBe(countryName('DE'));
    expect(countryName('DE')).not.toBe('DE');
  });

  it('names the exceptionally reserved codes an address may hold', () => {
    for (const code of ['AC', 'TA', 'ZZ']) {
      expect(countryName(code)).not.toBe(code);
    }
    expect(countryOptions().some((option) => option.value === 'AC')).toBe(true);
    expect(countryOptions().some((option) => option.value === 'ZZ')).toBe(false);
  });

  it('falls back to the code for a country it cannot name', () => {
    expect(countryName('XX')).toBe('XX');
    expect(countryName('')).toBe('');
    expect(countryName('DEU')).toBe('DEU');
  });

  it('offers a stored code the catalogue does not hold, so it can be read and replaced', () => {
    // Stripe's "unknown region" code: a checkout can store it, a picker never offers it.
    const withStripeCode = countryOptions('ZZ');
    expect(withStripeCode.at(-1)).toEqual({ value: 'ZZ', label: countryName('ZZ') });
    expect(withStripeCode).toHaveLength(countryOptions().length + 1);
    expect(countryOptions('DE')).toBe(countryOptions());
    expect(countryOptions('')).toBe(countryOptions());
  });

  it('offers every stored code a filter lists, once each', () => {
    const withCodes = countryOptions(['DE', 'ZZ', 'XX', 'ZZ', '']);
    expect(withCodes.slice(-2)).toEqual([
      { value: 'ZZ', label: countryName('ZZ') },
      { value: 'XX', label: 'XX' },
    ]);
    expect(withCodes).toHaveLength(countryOptions().length + 2);
    expect(countryOptions(['DE', 'GB'])).toBe(countryOptions());
    expect(countryOptions([])).toBe(countryOptions());
  });
});
