// Ported from the Ember lexical-editor controller; matches Koenig's TK node
// detection for plain-text fields (title, excerpt).
const TK_REGEX = /(^|.)([^\p{L}\p{N}\s]*(TK)+[^\p{L}\p{N}\s]*)(.)?/u;
const WORD_CHAR_REGEX = /\p{L}|\p{N}/u;

function isValidMatch(match: RegExpExecArray): boolean {
  // negative lookbehind isn't supported before Safari 16.4, so the preceding
  // and following characters are captured and tested here
  if (match[1] && match[1].trim() && WORD_CHAR_REGEX.test(match[1])) {
    return false;
  }

  if (match[4] && match[4].trim() && WORD_CHAR_REGEX.test(match[4])) {
    return false;
  }

  return true;
}

export function textHasTk(text: string): boolean {
  let remaining = text;
  let match = TK_REGEX.exec(remaining);

  while (match !== null && !isValidMatch(match)) {
    remaining = remaining.slice(match.index + match[0].length - 1);
    match = TK_REGEX.exec(remaining);
  }

  return match !== null;
}
