import { describe, expect, it } from 'vitest';
import {
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_TOO_LONG,
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  OG_DESCRIPTION_MAX,
  OG_DESCRIPTION_TOO_LONG,
  OG_TITLE_MAX,
  OG_TITLE_TOO_LONG,
  TIERS_REQUIRED,
  VALIDATED_SETTINGS_FIELD_KEYS,
  X_DESCRIPTION_MAX,
  X_DESCRIPTION_TOO_LONG,
  X_TITLE_MAX,
  X_TITLE_TOO_LONG,
  overLength,
  settingsFieldError,
  settingsFieldErrorFor,
  validatedFieldsOf,
  type ValidatedSettingsFieldKey,
  type ValidatedSettingsFields,
} from './settings-fields';

const VALID = {
  visibility: 'public',
  tiers: [],
  meta_title: null,
  meta_description: null,
  og_title: null,
  og_description: null,
  twitter_title: null,
  twitter_description: null,
};

describe('overLength', () => {
  it('counts a multibyte character once', () => {
    expect(overLength('𝔘𝔘𝔘', 3)).toBe(false);
    expect(overLength('𝔘𝔘𝔘𝔘', 3)).toBe(true);
  });

  it('treats no value as empty', () => {
    expect(overLength(null, 0)).toBe(false);
  });
});

describe('validatedFieldsOf', () => {
  it('takes the keys the validator reads and leaves the rest behind', () => {
    const live = { ...VALID, meta_title: 'Meta', custom_excerpt: 'Excerpt', featured: true };

    expect(validatedFieldsOf(live)).toEqual({ ...VALID, meta_title: 'Meta' });
    expect(Object.keys(validatedFieldsOf(live))).toEqual([...VALIDATED_SETTINGS_FIELD_KEYS]);
  });

  it('is the whole of what the validator reads, so a removed key stops being checked', () => {
    const live = { ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) };
    const validated = validatedFieldsOf(live);
    // The same projection, built as the list without that key would build it.
    const withoutMetaTitle = { ...validated };
    delete (withoutMetaTitle as Partial<ValidatedSettingsFields>).meta_title;

    expect(settingsFieldError(validated)).toBe(META_TITLE_TOO_LONG);
    expect(settingsFieldError(withoutMetaTitle)).toBeNull();
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

  it('refuses a Facebook title past the column width', () => {
    expect(settingsFieldError({ ...VALID, og_title: 'a'.repeat(OG_TITLE_MAX) })).toBeNull();
    expect(settingsFieldError({ ...VALID, og_title: 'a'.repeat(OG_TITLE_MAX + 1) })).toBe(
      OG_TITLE_TOO_LONG,
    );
  });

  it('refuses a Facebook description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, og_description: 'a'.repeat(OG_DESCRIPTION_MAX) }),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, og_description: 'a'.repeat(OG_DESCRIPTION_MAX + 1) }),
    ).toBe(OG_DESCRIPTION_TOO_LONG);
  });

  it('refuses an X title past the column width', () => {
    expect(settingsFieldError({ ...VALID, twitter_title: 'a'.repeat(X_TITLE_MAX) })).toBeNull();
    expect(settingsFieldError({ ...VALID, twitter_title: 'a'.repeat(X_TITLE_MAX + 1) })).toBe(
      X_TITLE_TOO_LONG,
    );
  });

  it('refuses an X description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, twitter_description: 'a'.repeat(X_DESCRIPTION_MAX) }),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, twitter_description: 'a'.repeat(X_DESCRIPTION_MAX + 1) }),
    ).toBe(X_DESCRIPTION_TOO_LONG);
  });

  it('names the field the message is about', () => {
    expect(META_TITLE_TOO_LONG).toBe('Meta title cannot be longer than 300 characters.');
    expect(META_DESCRIPTION_TOO_LONG).toBe(
      'Meta description cannot be longer than 500 characters.',
    );
    expect(OG_TITLE_TOO_LONG).toBe('Facebook title cannot be longer than 300 characters.');
    expect(OG_DESCRIPTION_TOO_LONG).toBe(
      'Facebook description cannot be longer than 500 characters.',
    );
    expect(X_TITLE_TOO_LONG).toBe('X title cannot be longer than 300 characters.');
    expect(X_DESCRIPTION_TOO_LONG).toBe('X description cannot be longer than 500 characters.');
  });
});

describe('settingsFieldErrorFor', () => {
  it('passes a field under and at the column width, and refuses it past', () => {
    expect(settingsFieldErrorFor('meta_title', { ...VALID, meta_title: 'a' })).toBeNull();
    expect(
      settingsFieldErrorFor('meta_title', { ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX) }),
    ).toBeNull();
    expect(
      settingsFieldErrorFor('meta_title', { ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) }),
    ).toBe(META_TITLE_TOO_LONG);
  });

  it('reads only the field it is asked about', () => {
    const overLongTitle = { ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) };

    expect(settingsFieldErrorFor('meta_description', overLongTitle)).toBeNull();
  });

  it('refuses specific-tier access without a tier on the tier field', () => {
    const noTier: ValidatedSettingsFields = { ...VALID, visibility: 'tiers' };

    expect(settingsFieldErrorFor('tiers', noTier)).toBe(TIERS_REQUIRED);
    expect(settingsFieldErrorFor('visibility', noTier)).toBeNull();
  });

  it('says what the save-time validator says about the same field', () => {
    const past = 'a'.repeat(META_DESCRIPTION_MAX + 1);
    const overLimit: [ValidatedSettingsFieldKey, ValidatedSettingsFields][] = [
      ['meta_title', { ...VALID, meta_title: past }],
      ['meta_description', { ...VALID, meta_description: past }],
      ['og_title', { ...VALID, og_title: past }],
      ['og_description', { ...VALID, og_description: past }],
      ['twitter_title', { ...VALID, twitter_title: past }],
      ['twitter_description', { ...VALID, twitter_description: past }],
      ['tiers', { ...VALID, visibility: 'tiers' }],
    ];

    for (const [key, fields] of overLimit) {
      expect(settingsFieldErrorFor(key, fields)).not.toBeNull();
      expect(settingsFieldErrorFor(key, fields)).toBe(settingsFieldError(fields));
    }
  });
});
