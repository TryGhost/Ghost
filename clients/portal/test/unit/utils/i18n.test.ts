import { afterEach, describe, expect, test } from 'vitest';
import i18n, { t } from '../../../src/utils/i18n';

// Portal loads every supported locale up front from '@tryghost/i18n/registry/portal'
// and switches with changeLanguage. Asserting a translated string is the only way to
// catch a broken registry: translation keys are the English strings, so a registry
// that resolves nothing still renders correct-looking English.
describe('portal i18n', () => {
  afterEach(() => {
    i18n.changeLanguage('en');
  });

  test('serves bundled translations after changing language', () => {
    i18n.changeLanguage('nl');

    expect(t('Account settings')).toBe('Gegevens');
  });

  test('falls back to English for a locale it does not bundle', () => {
    i18n.changeLanguage('xx');

    expect(t('Account settings')).toBe('Account settings');
  });
});
