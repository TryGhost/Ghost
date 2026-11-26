import { stripInvisibleChars } from '@tryghost/string';
import unidecode from 'unidecode';
import { z } from 'zod';

// A slug here is a readable name minted from a name a person chose: lowercase ASCII letters and
// digits, with one separator between words. People type slugs by hand, such as a custom field's key
// in a member filter, a CSV column or an email replacement string, so what a slug may contain is an
// allowlist rather than whatever Ghost's slugify lets through, and its separator is the one the
// places it is typed agree on. The separator is the only thing that differs between kinds of slug:
// a custom field's key is a slug with an underscore between its words, and a segment's slug one
// with a hyphen. This module says what a slug is, its format, its type and the guard that checks
// one, and mints slugs, numbers them and reads them from outside. Transliteration and the stripping
// of invisible characters stay with the libraries that own them.

/** The character a slug puts between words, and before a number added to it. */
export type Separator = '_' | '-';

declare const separatedBy: unique symbol;

/**
 * A string in a slug's format, with `S` between its words. The separator is part of the type, so
 * a slug with an underscore can't stand in for one with a hyphen. The brand is only in the type:
 * at runtime a slug is the string it was. A string becomes one through `isSlug`, which checks it.
 */
export type Slug<S extends Separator> = string & { readonly [separatedBy]: S };

/**
 * The format of a slug with `separator`, as the source of a regular expression: words of
 * lowercase ASCII letters and digits, joined by single separators, with none at either end. It
 * is the one definition of the format: the guard, the schema and a slug column's database pattern
 * all come from it. Neither separator means anything in a regular expression outside a class.
 */
export function slugPattern(separator: Separator): string {
  return `^[a-z0-9]+(${separator}[a-z0-9]+)*$`;
}

/** The format of a slug, for each separator. */
const FORMATS: Record<Separator, RegExp> = {
  _: new RegExp(slugPattern('_')),
  '-': new RegExp(slugPattern('-')),
};

/** Whether `value` is a slug with `separator`, in the format `slugPattern` gives. */
export function isSlug<S extends Separator>(value: string, separator: S): value is Slug<S> {
  return FORMATS[separator].test(value);
}

/** Every separator at either end of a slug, for each separator. */
const SEPARATORS_AT_ENDS: Record<Separator, RegExp> = { _: /^_+|_+$/g, '-': /^-+|-+$/g };

/** Every separator at the end of a slug, for each separator. */
const SEPARATORS_AT_END: Record<Separator, RegExp> = { _: /_+$/, '-': /-+$/ };

/** The word for each separator, as an error message names it. */
const SEPARATOR_WORDS: Record<Separator, string> = { _: 'underscores', '-': 'hyphens' };

/**
 * A schema that reads a string from outside, such as a filter's value, an import file's slug or a
 * request's body, as a slug with `separator`: in the format a minted slug has, or else an issue
 * that says what a slug can contain.
 */
export function slugSchema<S extends Separator>(separator: S) {
  return z.string().transform((value, context): Slug<S> => {
    if (isSlug(value, separator)) {
      return value;
    }
    context.issues.push({
      code: 'custom',
      input: value,
      message: `Slug can only contain lowercase letters and digits, in words joined by single ${SEPARATOR_WORDS[separator]}`,
    });
    return z.NEVER;
  });
}

/**
 * The slug minted from `name`: transliterated to ASCII, without invisible characters, in
 * lowercase, with apostrophes dropped so that a possessive reads as one word, and with each run
 * of characters other than letters and digits replaced by one `separator`. Runs collapse and the
 * ends are trimmed, so what is left is a slug unless it is empty. Undefined when `name` has no
 * letter or digit once transliterated, and the caller decides what to do about that.
 */
export function mintSlug<S extends Separator>(name: string, separator: S): Slug<S> | undefined {
  const minted = unidecode(stripInvisibleChars(name))
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, separator)
    .replace(SEPARATORS_AT_ENDS[separator], '');
  return isSlug(minted, separator) ? minted : undefined;
}

/**
 * How slugs of one kind are told apart when two names mint the same one: the second gets the
 * separator and 2, the third the separator and 3, and so on.
 */
export interface Numbering<S extends Separator> {
  readonly separator: S;
  /** The most characters a slug of this kind can have, its number included. */
  readonly maxLength: number;
  /** The highest number a slug can be given. */
  readonly lastNumber: number;
}

/**
 * `base` cut short enough that the separator and the highest number still fit within
 * `maxLength`. A cut can land on a separator, and a slug never ends with one, so a separator left
 * at the end is removed too. What is left is a slug, as `base` starts with a letter or a digit,
 * whenever `maxLength` leaves room for more than the number. When it doesn't, `base` is returned
 * as it is: longer than asked, but still a slug.
 */
export function withRoomForNumber<S extends Separator>(
  base: Slug<S>,
  { separator, maxLength, lastNumber }: Numbering<S>,
): Slug<S> {
  const fitted = base
    .slice(0, maxLength - (String(lastNumber).length + 1))
    .replace(SEPARATORS_AT_END[separator], '');
  return isSlug(fitted, separator) ? fitted : base;
}

/**
 * The slugs `numbering` gives `base`, in order: `base` cut by `withRoomForNumber`, then that with
 * the separator and 2, 3 and so on, up to the highest number. A slug followed by a separator and
 * digits is a slug, so every one passes the guard; one that didn't would be left out. Each is
 * made when it is asked for, so a caller that takes the first free one makes no more than it
 * needs.
 */
export function* numberedSlugs<S extends Separator>(
  base: Slug<S>,
  numbering: Numbering<S>,
): Generator<Slug<S>> {
  const fitted = withRoomForNumber(base, numbering);
  yield fitted;
  for (let number = 2; number <= numbering.lastNumber; number += 1) {
    const numbered = `${fitted}${numbering.separator}${number}`;
    if (isSlug(numbered, numbering.separator)) {
      yield numbered;
    }
  }
}
