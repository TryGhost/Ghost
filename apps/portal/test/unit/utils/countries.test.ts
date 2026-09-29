import { afterEach, describe, expect, test } from 'vitest';
import i18n from '../../../src/utils/i18n';
import { countryOptions } from '../../../src/utils/countries';
import { COUNTRY_CODES } from '@tryghost/metafield-types/countries';

describe('countryOptions', () => {
  afterEach(() => {
    i18n.changeLanguage('en');
  });

  test('lists every country by name, in name order', () => {
    const options = countryOptions();
    expect(options).toHaveLength(COUNTRY_CODES.length);
    expect(options.find((option) => option.value === 'DE')).toEqual({
      value: 'DE',
      label: 'Germany',
    });
    const labels = options.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
  });

  test('survives a site locale Intl does not accept', () => {
    // ghost_head hands Portal the site locale as configured, and `en_US` is not a
    // language tag Intl accepts. This runs inside a render, so it must not throw.
    i18n.changeLanguage('en_US');
    expect(() => countryOptions()).not.toThrow();
    expect(countryOptions()).toHaveLength(COUNTRY_CODES.length);
  });

  test('names a stored code the list does not hold where the browser can, as Admin does', () => {
    // The Canary Islands: a code the browser can name, but not a country of its own,
    // so the address form does not offer it.
    expect(countryOptions('IC').at(-1)).toEqual({ value: 'IC', label: 'Canary Islands' });
    // A malformed imported value has no name; the code is shown so it can be seen and replaced.
    expect(countryOptions('DEU').at(-1)).toEqual({ value: 'DEU', label: 'DEU' });
    // A stored code the list holds is not offered twice.
    expect(countryOptions('DE')).toHaveLength(COUNTRY_CODES.length);
  });
});
