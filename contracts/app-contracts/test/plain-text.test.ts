import { describe, expect, it } from 'vitest';

import { isPlainText, toPlainText } from '../src/plain-text.ts';

describe('plain text', () => {
  it('is letters, marks, digits, punctuation, symbols and spaces, with the joiners', () => {
    for (const text of ['', 'Podcast', 'Épisodes · 2', '👩\u200d💻', 'می\u200cخواهم', 'a\u00a0b']) {
      expect(isPlainText(text), text).toBe(true);
    }
  });

  it('is never text that reorders, hides or breaks a line', () => {
    for (const text of [
      '\u202eabc',
      'a\u2066',
      '\u200eabc',
      'a\u00adb',
      'a\nb',
      'a\tb',
      '\ue000',
    ]) {
      expect(isPlainText(text), JSON.stringify(text)).toBe(false);
    }
  });

  it('can be made from any text by dropping the characters it refuses', () => {
    expect(toPlainText('\u202esedosipe\u202c · \u200ePodcast\n')).toBe('sedosipe · Podcast');
    expect(toPlainText('👩\u200d💻 Code')).toBe('👩\u200d💻 Code');
    expect(isPlainText(toPlainText('a\u2066b\u0000c\u2028d'))).toBe(true);
  });
});
