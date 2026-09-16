import { describe, expect, it } from 'vitest';
import { textHasTk } from './tk';

describe('textHasTk', () => {
  it.each(['TK', 'Title TK', 'TK: draft', '[TK] later', 'Update (TKTK) soon', 'end. TK'])(
    'detects a TK marker in %j',
    (text) => {
      expect(textHasTk(text)).toBe(true);
    },
  );

  it.each(['', 'Talk', 'STKS', 'TKA', 'ATK', 'end.TK', 'network', 'tk'])(
    'ignores TK inside a word in %j',
    (text) => {
      expect(textHasTk(text)).toBe(false);
    },
  );

  it('skips an invalid match to find a later valid one', () => {
    expect(textHasTk('ATK and then TK')).toBe(true);
  });
});
