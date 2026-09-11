import i18nLib from '@tryghost/i18n/registry/search';

// App builds its i18n instance from the site locale and feeds i18n.dir() straight
// into SearchIndex, where 'rtl' flips flexsearch to reverse tokenization. These
// assertions pin that contract: a broken registry would still return usable
// English (the translation keys are the English strings) but would take the
// direction with it.
describe('sodo-search i18n', () => {
  it('serves bundled translations for a right-to-left locale', () => {
    const i18n = i18nLib('ar', 'search');

    expect(i18n.dir()).toBe('rtl');
    expect(i18n.t('No matches found')).toBe('لا يوجد نتائج مطابقة');
  });

  it('serves bundled translations for a left-to-right locale', () => {
    const i18n = i18nLib('nl', 'search');

    expect(i18n.dir()).toBe('ltr');
    expect(i18n.t('No matches found')).toBe('Geen resultaten gevonden');
  });

  it('falls back to English for a locale it does not bundle', () => {
    const i18n = i18nLib('xx', 'search');

    expect(i18n.dir()).toBe('ltr');
    expect(i18n.t('No matches found')).toBe('No matches found');
  });
});
