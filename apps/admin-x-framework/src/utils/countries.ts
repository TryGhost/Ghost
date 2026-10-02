import { COUNTRY_CODES } from '@tryghost/metafield-types/countries';

// Named by the browser rather than a bundled list, as Portal names them, so staff and
// member read the same name for a code: "Congo - Kinshasa" rather than a long official
// form that neither fits a picker nor tells the two Congos apart at a glance.
const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** The name a reader sees for a country code, or the code itself for one the browser cannot name. */
export const countryName = (code: string): string => {
  try {
    // Codes are stored uppercased, but a value written before that rule may not be.
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    // A stored value is not always a well-formed region code, and `of` throws on one
    // that isn't.
    return code;
  }
};

export interface CountryOption {
  value: string;
  label: string;
}

// Built on first use rather than at import: naming and sorting 250 countries is work
// only a screen with an address needs.
let catalogue: CountryOption[] | undefined;

/**
 * Every country as an option for an address picker, in name order.
 *
 * A stored code the catalogue does not hold (a Stripe-only shipping code such as
 * Ascension Island, or an imported value) is offered too, so what a record holds is
 * always on the list, can be read back, and can be picked away from. A filter holds
 * several, so more than one can be passed.
 */
export function countryOptions(stored?: string | readonly string[]): CountryOption[] {
  catalogue ??= COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })).sort(
    (a, b) => a.label.localeCompare(b.label, 'en'),
  );
  const known = catalogue;
  const extra = (typeof stored === 'string' ? [stored] : (stored ?? [])).filter(
    (code, index, codes) =>
      code && codes.indexOf(code) === index && !known.some((option) => option.value === code),
  );
  if (extra.length === 0) {
    return catalogue;
  }
  return [...catalogue, ...extra.map((code) => ({ value: code, label: countryName(code) }))];
}
