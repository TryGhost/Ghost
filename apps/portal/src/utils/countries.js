import i18n from './i18n';
import { COUNTRY_CODES } from '@tryghost/metafield-types/countries';

// Cached by language, the way the date formatters are: naming and sorting 250 countries
// runs on every render of a form that holds an address, and the language changes at most
// once a page. A browser old enough not to have `Intl.DisplayNames` lists the codes.
const cataloguesByLanguage = new Map();

function catalogue(language) {
  let entry = cataloguesByLanguage.get(language);
  if (!entry) {
    // Both guarded: a site locale Intl does not accept (`en_US`, say) throws from
    // either, and this runs inside a render, where a throw takes the whole page down.
    let displayNames = null;
    try {
      displayNames = new Intl.DisplayNames([language], { type: 'region' });
    } catch {
      // Left unnamed, so the codes stand in for the names.
    }
    let collator;
    try {
      collator = new Intl.Collator(language);
    } catch {
      collator = new Intl.Collator();
    }
    const name = (code) => {
      try {
        return displayNames?.of(code) || code;
      } catch {
        // A stored value is not always a well-formed region code, and `of` throws on
        // one that isn't.
        return code;
      }
    };
    const options = COUNTRY_CODES.map((code) => ({ value: code, label: name(code) })).sort((a, b) =>
      collator.compare(a.label, b.label),
    );
    entry = { options, name };
    cataloguesByLanguage.set(language, entry);
  }
  return entry;
}

/**
 * The countries as options for a select, named in the site's language and sorted by name.
 *
 * A stored code the catalogue does not hold (a Stripe-only shipping code, or an imported
 * value) is offered too, named where the browser can (Ascension Island for `AC`) and as
 * the code otherwise, so the member sees what their record holds rather than an empty
 * select, and can pick away from it. Admin names such a code the same way.
 */
export function countryOptions(stored) {
  const { options, name } = catalogue(i18n.language || 'en');
  if (!stored || options.some((option) => option.value === stored)) {
    return options;
  }
  return [...options, { value: stored, label: name(stored) }];
}
