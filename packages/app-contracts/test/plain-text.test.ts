import { describe, expect, it } from 'vitest';

import { isPlainText, toPlainText } from '../src/plain-text.ts';

describe('plain text', () => {
  it('is letters, marks, digits, punctuation, symbols and spaces, with the joiners', () => {
    for (const text of ['', 'Podcast', 'Épisodes · 2', '👩‍💻', 'می‌خواهم', 'a b']) {
      expect(isPlainText(text), text).toBe(true);
    }
  });

  it('is never text that reorders, hides or breaks a line', () => {
    for (const text of ['‮abc', 'a⁦', '‎abc', 'a­b', 'a\nb', 'a\tb', '']) {
      expect(isPlainText(text), JSON.stringify(text)).toBe(false);
    }
  });

  it('can be made of any text, by dropping what it refuses', () => {
    expect(toPlainText('‮sedosipe‬ · ‎Podcast\n')).toBe('sedosipe · Podcast');
    expect(toPlainText('👩‍💻 Code')).toBe('👩‍💻 Code');
    expect(isPlainText(toPlainText('a⁦b\u0000c d'))).toBe(true);
  });
});
