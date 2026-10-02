import { describe, expect, it } from 'vitest';
import {
  CODE_INJECTION_FOOT_TOO_LONG,
  CODE_INJECTION_HEAD_TOO_LONG,
  CODE_INJECTION_MAX,
  EXCERPT_MAX,
  EXCERPT_TOO_LONG,
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_TOO_LONG,
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  OG_DESCRIPTION_MAX,
  OG_DESCRIPTION_TOO_LONG,
  OG_TITLE_MAX,
  OG_TITLE_TOO_LONG,
  TIERS_REQUIRED,
  TITLE_MAX,
  TITLE_TOO_LONG,
  VALIDATED_SETTINGS_FIELD_KEYS,
  X_DESCRIPTION_MAX,
  X_DESCRIPTION_TOO_LONG,
  X_TITLE_MAX,
  X_TITLE_TOO_LONG,
  overLength,
  settingsFieldError,
  settingsFieldErrorFor,
  tiersIncomplete,
  titleError,
  validatedFieldsOf,
  type ValidatedSettingsFieldKey,
  type ValidatedSettingsFields,
} from './settings-fields';

// One character to Core's model validator, two code points to its API schema.
const EMOJI_WITH_SELECTOR = '\u2764\uFE0F';

const VALID = {
  visibility: 'public',
  tiers: [],
  email_subject: null,
  custom_excerpt: null,
  codeinjection_head: null,
  codeinjection_foot: null,
  meta_title: null,
  meta_description: null,
  canonical_url: null,
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

describe('titleError', () => {
  it('passes a title at the limit and refuses one past it', () => {
    expect(titleError('a'.repeat(TITLE_MAX))).toBeNull();
    expect(titleError('a'.repeat(TITLE_MAX + 1))).toBe(TITLE_TOO_LONG);
    expect(titleError('')).toBeNull();
  });

  it('counts the title Core stores, without the whitespace around it', () => {
    expect(titleError(` ${'a'.repeat(TITLE_MAX)} `)).toBeNull();
  });

  it('counts an astral symbol, and an emoji with its presentation selector, once', () => {
    expect(titleError('𝔘'.repeat(TITLE_MAX))).toBeNull();
    expect(titleError('𝔘'.repeat(TITLE_MAX + 1))).toBe(TITLE_TOO_LONG);
    expect(titleError(EMOJI_WITH_SELECTOR.repeat(TITLE_MAX))).toBeNull();
    expect(titleError(EMOJI_WITH_SELECTOR.repeat(TITLE_MAX + 1))).toBe(TITLE_TOO_LONG);
  });

  it('names the field the message is about', () => {
    expect(TITLE_TOO_LONG).toBe('Title cannot be longer than 255 characters.');
  });
});

describe('validatedFieldsOf', () => {
  it('takes the keys the validator reads and leaves the rest behind', () => {
    const live = { ...VALID, meta_title: 'Meta', featured: true, lexical: '{}' };

    expect(validatedFieldsOf(live)).toEqual({ ...VALID, meta_title: 'Meta' });
    expect(Object.keys(validatedFieldsOf(live))).toEqual([...VALIDATED_SETTINGS_FIELD_KEYS]);
  });

  it('is the whole of what the validator reads, so a removed key stops being checked', () => {
    const live = { ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) };
    const validated = validatedFieldsOf(live);
    // The same projection, built as the list without that key would build it.
    const withoutMetaTitle = { ...validated };
    delete (withoutMetaTitle as Partial<ValidatedSettingsFields>).meta_title;

    expect(settingsFieldError(validated, false)).toBe(META_TITLE_TOO_LONG);
    expect(settingsFieldError(withoutMetaTitle, false)).toBeNull();
  });
});

describe('settingsFieldError', () => {
  it('validates the email subject on every save, counting Unicode characters', () => {
    expect(settingsFieldError({ ...VALID, email_subject: '𝔘'.repeat(300) }, false)).toBeNull();
    expect(settingsFieldError({ ...VALID, email_subject: '𝔘'.repeat(301) }, false)).toBe(
      'Email subject cannot be longer than 300 characters.',
    );
    expect(settingsFieldError({ ...VALID, email_subject: '' }, false)).toBeNull();
  });
  it('passes fields that break no rule', () => {
    expect(settingsFieldError(VALID, false)).toBeNull();
  });

  it('refuses specific-tier access without a tier on a post that exists', () => {
    expect(settingsFieldError({ ...VALID, visibility: 'tiers' }, false)).toBe(TIERS_REQUIRED);
  });

  it('lets a new post keep specific-tier access without a tier', () => {
    expect(settingsFieldError({ ...VALID, visibility: 'tiers' }, true)).toBeNull();
    // The pair is still incomplete: the section asks for a tier either way.
    expect(tiersIncomplete({ ...VALID, visibility: 'tiers' })).toBe(true);
  });

  it('holds a new post to every other rule', () => {
    expect(settingsFieldError({ ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) }, true)).toBe(
      META_TITLE_TOO_LONG,
    );
  });

  it('refuses a meta title past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, meta_title: 'a'.repeat(META_TITLE_MAX + 1) }, false),
    ).toBe(META_TITLE_TOO_LONG);
  });

  it('refuses a meta description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, meta_description: 'a'.repeat(META_DESCRIPTION_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError(
        { ...VALID, meta_description: 'a'.repeat(META_DESCRIPTION_MAX + 1) },
        false,
      ),
    ).toBe(META_DESCRIPTION_TOO_LONG);
  });

  it('refuses a Facebook title past the column width', () => {
    expect(settingsFieldError({ ...VALID, og_title: 'a'.repeat(OG_TITLE_MAX) }, false)).toBeNull();
    expect(settingsFieldError({ ...VALID, og_title: 'a'.repeat(OG_TITLE_MAX + 1) }, false)).toBe(
      OG_TITLE_TOO_LONG,
    );
  });

  it('refuses a Facebook description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, og_description: 'a'.repeat(OG_DESCRIPTION_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, og_description: 'a'.repeat(OG_DESCRIPTION_MAX + 1) }, false),
    ).toBe(OG_DESCRIPTION_TOO_LONG);
  });

  it('refuses an X title past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, twitter_title: 'a'.repeat(X_TITLE_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, twitter_title: 'a'.repeat(X_TITLE_MAX + 1) }, false),
    ).toBe(X_TITLE_TOO_LONG);
  });

  it('refuses an X description past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, twitter_description: 'a'.repeat(X_DESCRIPTION_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError(
        { ...VALID, twitter_description: 'a'.repeat(X_DESCRIPTION_MAX + 1) },
        false,
      ),
    ).toBe(X_DESCRIPTION_TOO_LONG);
  });

  it('refuses an excerpt past the column width', () => {
    expect(
      settingsFieldError({ ...VALID, custom_excerpt: 'a'.repeat(EXCERPT_MAX) }, false),
    ).toBeNull();
    expect(
      settingsFieldError({ ...VALID, custom_excerpt: 'a'.repeat(EXCERPT_MAX + 1) }, false),
    ).toBe(EXCERPT_TOO_LONG);
  });

  it('counts an excerpt by code point, as the API schema does', () => {
    const selectors = EMOJI_WITH_SELECTOR.repeat(EXCERPT_MAX / 2);

    expect(settingsFieldError({ ...VALID, custom_excerpt: selectors }, false)).toBeNull();
    expect(settingsFieldError({ ...VALID, custom_excerpt: `${selectors}a` }, false)).toBe(
      EXCERPT_TOO_LONG,
    );
  });

  it('refuses header and footer code past the column width', () => {
    const atLimit = 'a'.repeat(CODE_INJECTION_MAX);
    const pastLimit = 'a'.repeat(CODE_INJECTION_MAX + 1);

    expect(settingsFieldError({ ...VALID, codeinjection_head: atLimit }, false)).toBeNull();
    expect(settingsFieldError({ ...VALID, codeinjection_head: pastLimit }, false)).toBe(
      CODE_INJECTION_HEAD_TOO_LONG,
    );
    expect(settingsFieldError({ ...VALID, codeinjection_foot: atLimit }, false)).toBeNull();
    expect(settingsFieldError({ ...VALID, codeinjection_foot: pastLimit }, false)).toBe(
      CODE_INJECTION_FOOT_TOO_LONG,
    );
  });

  it('names the field the message is about', () => {
    expect(EXCERPT_TOO_LONG).toBe('Excerpt cannot be longer than 300 characters.');
    expect(CODE_INJECTION_HEAD_TOO_LONG).toBe(
      'Header code cannot be longer than 65535 characters.',
    );
    expect(CODE_INJECTION_FOOT_TOO_LONG).toBe(
      'Footer code cannot be longer than 65535 characters.',
    );
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
    const pastCode = 'a'.repeat(CODE_INJECTION_MAX + 1);
    const overLimit: [ValidatedSettingsFieldKey, ValidatedSettingsFields][] = [
      ['custom_excerpt', { ...VALID, custom_excerpt: past }],
      ['codeinjection_head', { ...VALID, codeinjection_head: pastCode }],
      ['codeinjection_foot', { ...VALID, codeinjection_foot: pastCode }],
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
      expect(settingsFieldErrorFor(key, fields)).toBe(settingsFieldError(fields, false));
    }
  });
});

describe('canonical URL validation', () => {
  it.each(['https://example.com/original/', 'http://localhost:2368/story/', '/original/', ''])(
    'accepts %s',
    (canonicalUrl) => {
      expect(
        settingsFieldErrorFor('canonical_url', { ...VALID, canonical_url: canonicalUrl }),
      ).toBeNull();
    },
  );
  it.each([
    'example.com/path',
    'https://example.com/a b',
    'https://',
    'https://[invalid]',
    'https://example.com:invalid',
  ])('refuses %s', (canonicalUrl) => {
    expect(settingsFieldErrorFor('canonical_url', { ...VALID, canonical_url: canonicalUrl })).toBe(
      'Please enter a valid URL',
    );
  });
  it('enforces the URL column limit', () => {
    expect(
      settingsFieldErrorFor('canonical_url', { ...VALID, canonical_url: '/' + 'a'.repeat(2000) }),
    ).toBe('Canonical URL is too long, max 2000 chars');
  });
});
