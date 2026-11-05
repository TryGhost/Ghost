import { z } from 'zod';

import { isPlainText } from '../plain-text.ts';

// A character that shows something on its own: a letter, digit, punctuation or symbol, but not
// the blank Braille pattern or one Unicode says to draw as nothing, such as a joiner or a Hangul
// filler. Whitespace and marks aren't any of those.
const VISIBLE_CHARACTER = new RegExp(
  '(?![\\u2800\\p{Default_Ignorable_Code_Point}])[\\p{L}\\p{N}\\p{P}\\p{S}]',
  'u',
);

const shows = (text: string) => VISIBLE_CHARACTER.test(text);

// Shows nothing, and holds nothing plain text refuses other than whitespace, so trimming never
// takes off a character, such as one that reorders text, that should get the text refused.
const blank = (character: string) =>
  !shows(character) && isPlainText(character.replace(/\s/gu, ''));

// Made on first use, so loading the contract doesn't set one up.
let graphemes: Intl.Segmenter | undefined;

/**
 * Takes off each end the characters, as a reader sees them, that show nothing: a space with a
 * mark on it goes, an emoji with its variation selector stays, and so does anything invisible
 * that joins onto a visible character. Walks in from each end, so a long run of spaces costs no
 * more than its length.
 */
function trimEdges(value: string): string {
  graphemes ??= new Intl.Segmenter();
  const characters = graphemes.segment(value);
  let start = value.length;
  for (const { segment, index } of characters) {
    if (!blank(segment)) {
      start = index;
      break;
    }
  }
  let end = value.length;
  while (end > start) {
    const { segment, index } = characters.containing(end - 1) as Intl.SegmentData;
    if (!blank(segment)) {
      break;
    }
    end = index;
  }
  return value.slice(start, end);
}

/**
 * One line of plain text, as an app serves it. What shows nothing is taken off both ends, and
 * text with nothing visible left, such as a name of Hangul fillers, is refused.
 */
export function plainText(maxLength: number) {
  return (
    z
      .string('Expected text')
      // Whitespace first, as a character that joins onto a space, such as a skin tone, would keep it.
      .trim()
      .overwrite(trimEdges)
      .refine(shows, 'Expected text')
      .max(maxLength, `Expected at most ${maxLength} characters`)
      .refine(isPlainText, 'Expected plain text on one line')
  );
}

// Any letter, digit, punctuation or symbol, fillers included: the rule manifests were stored under
// before blank names were refused.
const ANY_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;

/**
 * One line of plain text, as Ghost stored it. Laxer than `plainText`, so a manifest stored before
 * blank names were refused still reads, and the app can still be listed and uninstalled.
 */
export function storedText(maxLength: number) {
  return z
    .string('Expected text')
    .trim()
    .refine((value) => ANY_CHARACTER.test(value), 'Expected text')
    .max(maxLength, `Expected at most ${maxLength} characters`)
    .refine(isPlainText, 'Expected plain text on one line');
}
