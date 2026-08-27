// Neither package ships types.
const { stripInvisibleChars } = require('@tryghost/string') as {
  stripInvisibleChars(input: string): string;
};
const unidecode = require('unidecode') as (input: string) => string;

/** Every character a key may contain. Nothing else survives minting. */
export const KEY_CHARACTERS = /^[a-z0-9_]+$/;

/**
 * Mint the key a field is addressed by, from the name a publisher chose.
 *
 * A key is typed by hand into member filters, CSV columns, email replacement strings
 * and, later, themes. Those agree on letters, digits and the underscore, and disagree
 * about everything else, so what a key may contain is stated here as an allowlist
 * rather than inherited from slugify, whose separator and reserved characters answer
 * to URLs. The two formats happen to be near-identical today; they are not the same
 * rule, and this one belongs where its consumers are known.
 *
 * Transliteration and invisible-character stripping stay with the libraries that own
 * them. Only the policy is local.
 *
 * Runs collapse and the ends are trimmed, so no key can lead or trail with a
 * separator. `__proto__` is unmintable as a result, which is worth more than
 * reserving it would be.
 *
 * Returns an empty string for a name with nothing usable in it; the caller decides
 * what to do about that.
 */
export function mintableKey(name: string): string {
  return (
    unidecode(stripInvisibleChars(name))
      .toLowerCase()
      // Dropped rather than separated, so a possessive reads as one word.
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}
