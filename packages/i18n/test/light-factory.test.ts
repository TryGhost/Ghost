import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { i18nFromGlob } from '../src/esm-factory.ts';
import { registryFromGlob } from '../src/glob-registry.ts';
import { createLightI18n, lightI18nFromGlob } from '../src/light-factory.ts';
import searchI18n from '../src/light/search.ts';
import type { TranslationResource } from '../src/types.ts';

type Glob = Record<string, TranslationResource>;

// Namespaces whose apps use no i18next feature beyond key lookup, `{name}`
// interpolation and dir().
const NAMESPACES: Record<string, Glob> = {
  search: import.meta.glob('../locales/*/search.json', { eager: true, import: 'default' }),
  comments: import.meta.glob('../locales/*/comments.json', { eager: true, import: 'default' }),
  'signup-form': import.meta.glob('../locales/*/signup-form.json', {
    eager: true,
    import: 'default',
  }),
};

const EXTRA_LOCALES = [
  'xx',
  'NL',
  'de-ch',
  'pt-br',
  'pt_BR',
  'zh_Hant',
  'zh-Hant-TW',
  'sr-cyrl-RS',
  'no',
  'no-NO',
  'nb-NO',
  'en-x-test',
  'ar-EG',
  'fa-IR',
  'he-IL',
  'xx-Arab',
  'en-',
];

const EXTRA_KEYS = ['Not a translation key', 'Hi {a}, {b}, {c} and { d }'];

const valuesFor = (key: string) =>
  Object.fromEntries(
    [...key.matchAll(/\{(.+?)\}/g)].map(([, name]) => [name!.trim(), `<${name}> & "/'`]),
  );

describe('light i18n factory', function () {
  for (const [ns, glob] of Object.entries(NAMESPACES)) {
    it(`matches the i18next-backed factory for ${ns}`, function () {
      const i18next = i18nFromGlob(glob, ns);
      const light = lightI18nFromGlob(glob);
      const registry = registryFromGlob(glob);
      const keys = [...Object.keys(registry.en!), ...EXTRA_KEYS];
      const locales = [...Object.keys(registry), ...EXTRA_LOCALES];

      for (const locale of locales) {
        const expected = i18next(locale, ns);
        const actual = light(locale);

        assert.equal(actual.dir(), expected.dir(), `dir() for ${locale}`);
        for (const key of keys) {
          assert.equal(actual.t(key), expected.t(key), `${locale}: ${key}`);
          assert.equal(
            actual.t(key, valuesFor(key)),
            expected.t(key, valuesFor(key)),
            `${locale}: ${key} with values`,
          );
        }
        assert.equal(
          actual.t(EXTRA_KEYS[1]!, { a: undefined, b: null, c: 5 }),
          expected.t(EXTRA_KEYS[1]!, { a: undefined, b: null, c: 5 }),
        );
      }
    });
  }

  it('reads text direction from the requested locale when no bundle has strings', function () {
    const i18n = createLightI18n({})('ar');

    assert.equal(i18n.dir(), 'rtl');
    assert.equal(i18n.t('Hello'), 'Hello');
  });

  it('treats Arabic-script locales as right-to-left', function () {
    assert.equal(createLightI18n({ 'pa-Arab': { Hello: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' } })('pa-Arab').dir(), 'rtl');
  });

  describe('light search entry', function () {
    it('resolves search translations from its own locale files', function () {
      assert.equal(searchI18n('nl').t('No matches found'), 'Geen resultaten gevonden');
    });

    it('defaults to English', function () {
      assert.equal(searchI18n().t('No matches found'), 'No matches found');
      assert.equal(searchI18n().dir(), 'ltr');
    });
  });
});
