import {
  SOCIAL_PLATFORM_CONFIG_BY_KEY,
  normalizeSocialInput,
} from '@/settings/utils/social-urls/index';

describe('normalizeSocialInput', () => {
  it('returns empty display and null stored for empty input', () => {
    const result = normalizeSocialInput('linkedin', '');
    expect(result.displayValue).toBe('');
    expect(result.storedValue).toBeNull();
  });

  it('produces a displayValue that round-trips through storage', () => {
    // The post-blur display must match what the field will show on reload,
    // which is toDisplayValue(storedValue). Otherwise the user sees one
    // value after blur and a different value after refresh.
    const cases: Array<{ key: Parameters<typeof normalizeSocialInput>[0]; input: string }> = [
      { key: 'linkedin', input: 'https://uk.linkedin.com/in/ghost-team' },
      { key: 'linkedin', input: 'linkedin.com/in/ghost-team' },
      { key: 'twitter', input: 'https://x.com/@ghost' },
      { key: 'facebook', input: 'facebook.com/ghost' },
      { key: 'mastodon', input: 'https://mastodon.social/@ghost' },
      { key: 'youtube', input: 'http://youtube.com/@ghost' },
    ];

    for (const { key, input } of cases) {
      const { displayValue, storedValue } = normalizeSocialInput(key, input);
      const expected = SOCIAL_PLATFORM_CONFIG_BY_KEY[key].toDisplayValue(storedValue);
      expect(displayValue, `displayValue should round-trip for ${key} input "${input}"`).toBe(
        expected,
      );
    }
  });

  it('falls back to the raw stored value when a legacy handle fails validation', () => {
    // Stored handles can predate current validation rules (or the current
    // platform rules entirely). Display must never crash the settings UI —
    // the raw value is shown and validation flags it when the user edits.
    const { toDisplayValue } = SOCIAL_PLATFORM_CONFIG_BY_KEY.twitter;
    expect(toDisplayValue('not a valid handle!!')).toBe('not a valid handle!!');
    expect(toDisplayValue('@ghost')).toBe('https://x.com/ghost');
  });

  it('strips the regional subdomain from LinkedIn display because it is not in storage', () => {
    // `uk.linkedin.com` is a valid input, but the stored handle drops the
    // regional prefix. The displayed value after blur should reflect what
    // will be displayed on reload — `www.linkedin.com`, not `uk.`.
    const { displayValue, storedValue } = normalizeSocialInput(
      'linkedin',
      'https://uk.linkedin.com/in/ghost-team',
    );
    expect(storedValue).toBe('ghost-team');
    expect(displayValue).toBe('https://www.linkedin.com/in/ghost-team');
  });
});
