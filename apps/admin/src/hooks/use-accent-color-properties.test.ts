import { describe, expect, it } from 'vitest';
import { adjustAccentColor } from './use-accent-color-properties';

describe('adjustAccentColor', () => {
  it('keeps an accent that already contrasts with the background', () => {
    expect(adjustAccentColor('#ff1a75', 'light')).toBe('#FF1A75');
    expect(adjustAccentColor('#ffffff', 'dark')).toBe('#FFFFFF');
  });

  it('darkens a low-contrast accent on the light background', () => {
    expect(adjustAccentColor('#ffffff', 'light')).toBe('#B3B3B3');
  });

  it('lightens a low-contrast accent on the dark background', () => {
    expect(adjustAccentColor('#000000', 'dark')).toBe('#4D4D4D');
  });

  it('returns an unparseable accent unchanged', () => {
    expect(adjustAccentColor('not-a-color', 'light')).toBe('not-a-color');
  });
});
