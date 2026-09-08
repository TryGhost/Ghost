import { describe, expect, it } from 'vitest';
import {
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_TOO_LONG,
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  TIERS_REQUIRED,
  overLength,
  settingsFieldError,
} from './settings-fields';

const VALID = { visibility: 'public', tiers: [], meta_title: null, meta_description: null };

describe('overLength', () => {
  it('counts a multibyte character once', () => {
    expect(overLength('𝔘𝔘𝔘', 3)).toBe(false);
    expect(overLength('𝔘𝔘𝔘𝔘', 3)).toBe(true);
  });

  it('treats no value as empty', () => {
    expect(overLength(null, 0)).toBe(false);
  });
});

describe('settingsFieldError', () => {
  it('passes fields that break no rule', () => {
    expect(settingsFieldError(VALID)).toBeNull();
  });

  it('refuses specific-tier access without a tier', () => {
    expect(settingsFieldError({ ...VALID, visibility: 'tiers' })).toBe(TIERS_REQUIRED);
  });

  it('refuses a meta title past the column width', () => {
    expect(settingsFieldError({ ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX) })).toBeNull();
    expect(settingsFieldError({ ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) })).toBe(
      META_TITLE_TOO_LONG,
    );
  });

  it('refuses a meta description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, meta_description: 'a'.repeat(META_DESCRIPTION_MAX) }),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, meta_description: 'a'.repeat(META_DESCRIPTION_MAX + 1) }),
    ).toBe(META_DESCRIPTION_TOO_LONG);
  });

  it('names the field the message is about', () => {
    expect(META_TITLE_TOO_LONG).toBe('Meta Title cannot be longer than 300 characters.');
    expect(META_DESCRIPTION_TOO_LONG).toBe(
      'Meta Description cannot be longer than 500 characters.',
    );
  });
});
