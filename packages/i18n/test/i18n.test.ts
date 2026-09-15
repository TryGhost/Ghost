import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';

import { i18nFromGlob } from '../src/esm-factory.ts';
import { createGenerateResources } from '../src/i18n-core.ts';
import i18n from '../src/index.ts';
import type { I18nFactory, Resources } from '../src/types.ts';

type I18nextInstance = ReturnType<I18nFactory>;

// i18next types these loosely (options.fallbackLng is a union, interpolation is
// optional); the assertions below know the concrete shape this package sets.
const fallbackOf = (instance: I18nextInstance) =>
  instance.options.fallbackLng as { no: string[]; default: string[] };
const interpolationOf = (instance: I18nextInstance) => instance.options.interpolation!;

const requireJson = createRequire(import.meta.url);

describe('i18n', function () {
  describe('ESM/browser entries (per-namespace static registries)', function () {
    // The real browser path: each public app imports '@tryghost/i18n/registry/<ns>',
    // resolved here from the actual shipped registry entries (src/registry/*.ts).
    // There is no root ESM entry and no CJS "browser" entry any more — apps must use
    // the per-namespace subpaths. These import()s cover ESM locale resolution, the
    // English fallback and the theme-stub behaviour public apps rely on.
    let portalI18n: I18nFactory;
    let ghostI18n: I18nFactory;

    beforeAll(async function () {
      portalI18n = (await import('../src/registry/portal.ts')).default;
      ghostI18n = (await import('../src/registry/ghost.ts')).default;
    });

    it('loads bundled public app translations without server-only helpers', function () {
      const t = portalI18n('nl', 'portal').t;

      assert.equal(t('Name'), 'Naam');
    });

    it('uses the default locale', function () {
      const t = portalI18n().t;

      assert.equal(t('Name'), 'Name');
    });

    it('uses single curly braces for browser interpolation', function () {
      const portalT = portalI18n('en', 'portal').t;
      const ghostT = ghostI18n('en', 'ghost').t;

      assert.equal(
        portalT('Welcome, {name}', { name: "<b>John O'Nolan</b>" }),
        "Welcome, <b>John O'Nolan</b>",
      );
      assert.equal(ghostT('Welcome, {name}', { name: 'John' }), 'Welcome, John');
    });

    it('falls back to English for missing bundled locales', function () {
      const resources = portalI18n.generateResources(['xx'], 'portal');
      const englishResources = portalI18n.generateResources(['en'], 'portal');

      assert.deepEqual(resources.xx, englishResources.en);
    });

    it('uses empty theme resources in browser builds', function () {
      const instance = portalI18n('en', 'theme');

      assert.deepEqual(instance.store.data.en.theme, {});
      assert.equal(instance.t('Read more'), 'Read more');
    });
  });

  it('does not have too-long strings for the Stripe personal note label', async function () {
    for (const locale of i18n.SUPPORTED_LOCALES) {
      const translationFile = requireJson(path.join(`../locales/`, locale, 'portal.json'));

      if (translationFile['Add a personal note']) {
        assert(
          translationFile['Add a personal note'].length <= 255,
          `[${locale}/portal.json] Stripe personal note label is too long`,
        );
      }
    }
  });

  it('is uses default export if available', async function () {
    const translationFile = requireJson(path.join(`../locales/`, 'nl', 'portal.json'));
    translationFile.Name = undefined;
    translationFile.default = {
      Name: 'Naam',
    };

    const t = i18n('nl', 'portal').t;
    assert.equal(t('Name'), 'Naam');
  });

  it('generateResources (CJS require path) resolves locales and falls back to English', function () {
    const resources = i18n.generateResources(['nl', 'xx'], 'portal');

    assert.equal(resources.nl.portal.Name, 'Naam');
    // 'xx' is not a bundled locale — the require loader falls back to English.
    assert.equal(resources.xx.portal.Name, i18n.generateResources(['en'], 'portal').en.portal.Name);
  });

  describe('per-namespace registry entries', function () {
    // Each entry wires together three things that only it knows: its glob
    // literal, the namespace it binds, and its package.json subpath. A mismatch
    // in any of them degrades silently to English, because the translation keys
    // are the English strings — so each fixture asserts a Dutch string that
    // exists in that namespace and no other.
    const REGISTRIES = {
      comments: () => import('../src/registry/comments.ts'),
      ghost: () => import('../src/registry/ghost.ts'),
      portal: () => import('../src/registry/portal.ts'),
      search: () => import('../src/registry/search.ts'),
      'signup-form': () => import('../src/registry/signup-form.ts'),
    };

    const FIXTURES = [
      { ns: 'comments', key: 'Anonymous', dutch: 'Anoniem' },
      { ns: 'ghost', key: 'All the best!', dutch: 'Tot snel!' },
      { ns: 'portal', key: 'Account settings', dutch: 'Gegevens' },
      { ns: 'search', key: 'No matches found', dutch: 'Geen resultaten gevonden' },
      { ns: 'signup-form', key: 'Email sent', dutch: 'E-mail verzonden' },
    ] as const;

    for (const { ns, key, dutch } of FIXTURES) {
      it(`resolves ${ns} translations from its own locale files`, async function () {
        const factory = (await REGISTRIES[ns]()).default;

        assert.equal(factory.namespace, ns);
        assert.equal(factory('nl', ns).t(key), dutch);
        assert.deepEqual(factory.SUPPORTED_LOCALES, i18n.SUPPORTED_LOCALES);
      });

      it(`falls back to English for an unknown ${ns} locale`, async function () {
        const factory = (await REGISTRIES[ns]()).default;

        assert.equal(factory('xx', ns).t(key), key);
      });
    }
  });

  describe('i18nFromGlob', function () {
    it('keys the registry by the locale segment of each glob path', function () {
      const factory = i18nFromGlob({ '/pkg/locales/nl/portal.json': { Name: 'Naam' } }, 'portal');

      assert.equal(factory.generateResources(['nl'], 'portal').nl.portal.Name, 'Naam');
    });

    it('skips glob keys that are not locale paths', function () {
      const factory = i18nFromGlob({ '/pkg/not-locales/portal.json': { Name: 'Nope' } }, 'portal');

      assert.deepEqual(factory.generateResources(['nl'], 'portal').nl.portal, {});
    });
  });

  describe('createGenerateResources', function () {
    // Unit-tests the injectable-loader factory directly (the shape the static ESM
    // registry uses), covering the English fallback + floor without a bundler.
    it('uses the loaded resource when present', function () {
      const gen = createGenerateResources((locale, ns) => ({ [`${locale}.${ns}`]: 'hit' }));
      const res = gen(['de'], 'ghost');

      assert.equal(res.de.ghost['de.ghost'], 'hit');
    });

    it('falls back to English when a locale is missing (undefined)', function () {
      const gen = createGenerateResources((locale) =>
        locale === 'en' ? { Name: 'English' } : undefined,
      );
      const res = gen(['xx'], 'portal');

      assert.equal(res.xx.portal.Name, 'English');
    });

    it('floors to an empty object when even English is missing', function () {
      // Loader always returns undefined — the English floor must prevent
      // mergeDefaultExport(undefined) from throwing.
      const gen = createGenerateResources(() => undefined);

      assert.doesNotThrow(() => gen(['xx'], 'portal'));
      const res = gen(['xx'], 'portal');
      assert.deepEqual(res.xx.portal, {});
    });

    it('merges an object default export onto the resource', function () {
      const gen = createGenerateResources(() => ({
        Name: 'Direct',
        default: { Name: 'FromDefault' },
      }));
      const res = gen(['de'], 'portal');

      assert.equal(res.de.portal.Name, 'FromDefault');
    });

    it('ignores a non-object default export', function () {
      const gen = createGenerateResources(() => ({ Name: 'Direct', default: 'not-an-object' }));
      const res = gen(['de'], 'portal');

      assert.equal(res.de.portal.Name, 'Direct');
    });
  });

  describe('Can use Portal resources', function () {
    describe('Dutch', function () {
      let t: I18nextInstance['t'];

      beforeAll(function () {
        t = i18n('nl', 'portal').t;
      });

      it('can translate `Name`', function () {
        assert.equal(t('Name'), 'Naam');
      });
    });
  });

  describe('Can use Signup-form resources', function () {
    describe('Afrikaans', function () {
      let t: I18nextInstance['t'];

      beforeAll(function () {
        t = i18n('af', 'signup-form').t;
      });

      it('can translate `Now check your email!`', function () {
        assert.equal(t('Now check your email!'), 'Kyk nou in jou e-pos!');
      });
    });
  });

  describe('Fallback when no language is chosen will be english', function () {
    describe('English fallback', function () {
      let t: I18nextInstance['t'];
      beforeAll(function () {
        t = i18n().t;
      });
      it('can translate with english when no language selected', function () {
        assert.equal(t('Back'), 'Back');
      });
    });
  });

  describe('Fallback will be nb when no is chosen', function () {
    describe('Norwegian bokmål fallback', function () {
      let t: I18nextInstance['t'];
      beforeAll(function () {
        t = i18n('no', 'portal').t;
      });
      it('Norwegian bokmål used when no is chosen', function () {
        assert.equal(t('Yearly'), 'Årlig');
      });
    });
  });

  describe('Language will be nb when nb is chosen', function () {
    describe('Norwegian bokmål', function () {
      let t: I18nextInstance['t'];
      beforeAll(function () {
        t = i18n('nb', 'portal').t;
      });
      it('Norwegian bokmål used when "nb" is chosen', function () {
        assert.equal(t('Yearly'), 'Årlig');
      });
    });
  });

  describe('Language is properly "nn" when "nn" is chosen', function () {
    describe('Norwegian Nynorsk', function () {
      let t: I18nextInstance['t'];
      beforeAll(function () {
        t = i18n('nn', 'portal').t;
      });
      it('Norwegian Nynorsk used when selected', function () {
        assert.equal(t('Yearly'), 'Årleg');
      });
    });
  });

  describe('directories and locales in i18n.js will match', function () {
    it('should have a key for each directory in the locales directory', async function () {
      const locales = await fs.readdir(path.join(import.meta.dirname, '../locales'));
      const supportedLocales = i18n.SUPPORTED_LOCALES;

      for (const locale of locales) {
        if (locale !== 'context.json') {
          assert(
            supportedLocales.includes(locale),
            `The locale ${locale} is not in the list of supported locales`,
          );
        }
      }
    });

    it('should have a directory for each key in SUPPORTED_LOCALES', async function () {
      const supportedLocales = i18n.SUPPORTED_LOCALES;

      for (const locale of supportedLocales) {
        const localeDir = path.join(import.meta.dirname, `../locales/${locale}`);
        const stats = await fs.stat(localeDir);
        assert(stats.isDirectory(), `The locale ${locale} does not have a directory`);
      }
    });
  });

  describe('newsletter i18n', function () {
    it('should be able to translate and interpolate a date', async function () {
      const t = i18n('fr', 'ghost').t;
      assert.equal(
        t('Your subscription will renew on {date}.', { date: '8 Oct 2024' }),
        'Votre abonnement sera renouvelé le 8 Oct 2024.',
      );
    });
  });
  describe('it gracefully falls back to en if a file is missing', function () {
    it('should be able to translate a key that is missing in the locale', async function () {
      const resources = i18n.generateResources(['xx'], 'portal');
      const englishResources = i18n.generateResources(['en'], 'portal');
      assert.deepEqual(resources.xx, englishResources.en);
    });
  });

  // The goal of the test below (TODO) is to make sure that new keys get added to context.json with
  // enough information to be useful to translators. The person best positioned to do this is
  // the person who added the key.  However, it's complicated by the order that translate and test
  // currently run in, so leaving it disabled for now.
  /*describe('context.json is valid', function () {
        it('should not contain any empty values', function () {
            const context = require('../locales/context.json');

            function checkForEmptyValues(obj, keypath = '') {
                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = keypath ? `${keypath}.${key}` : key;

                    if (value === null || value === undefined || value === '') {
                        assert.fail(`Empty value found at ${currentPath}. If you added a new key for translation, please add it to the packages/i18n/locales/context.json file.`);
                    }

                    if (typeof value === 'object' && value !== null) {
                        checkForEmptyValues(value, currentPath);
                    }
                }
            }

            checkForEmptyValues(context);
        });
    }); */

  // i18n theme translations when feature flag is enabled
  describe('theme resources', function () {
    let themeLocalesPath: string;
    let cleanup: () => Promise<void>;

    beforeEach(async function () {
      // Create a temporary theme locales directory
      themeLocalesPath = path.join(import.meta.dirname, 'temp-theme-locales');
      await fs.mkdir(themeLocalesPath, { recursive: true });
      cleanup = async () => {
        await fs.rm(themeLocalesPath, { recursive: true, force: true });
      };
    });

    afterEach(async function () {
      await cleanup();
    });

    it('loads translations from theme locales directory', async function () {
      // Create test translation files
      const enContent = {
        'Read more': 'Read more',
        Subscribe: 'Subscribe',
      };
      const frContent = {
        'Read more': 'Lire plus',
        Subscribe: "S'abonner",
      };

      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));
      await fs.writeFile(path.join(themeLocalesPath, 'fr.json'), JSON.stringify(frContent));

      const t = i18n('fr', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(t('Read more'), 'Lire plus');
      assert.equal(t('Subscribe'), "S'abonner");
    });

    it('falls back to en when translation is missing', async function () {
      // Create only English translation file
      const enContent = {
        'Read more': 'Read more',
        Subscribe: 'Subscribe',
      };
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));

      const t = i18n('fr', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(t('Read more'), 'Read more');
      assert.equal(t('Subscribe'), 'Subscribe');
    });

    it('uses empty translations when no files exist', async function () {
      const t = i18n('fr', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(t('Read more'), 'Read more');
      assert.equal(t('Subscribe'), 'Subscribe');
    });

    it('handles invalid JSON files gracefully', async function () {
      // Create invalid JSON file
      await fs.writeFile(path.join(themeLocalesPath, 'fr.json'), 'invalid json');

      const t = i18n('fr', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(t('Read more'), 'Read more');
      assert.equal(t('Subscribe'), 'Subscribe');
    });

    it('handles errors when both requested locale and English fallback files are invalid', async function () {
      // Create invalid JSON files for both requested locale and English fallback
      await fs.writeFile(path.join(themeLocalesPath, 'de.json'), 'invalid json');
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), 'also invalid json');

      const t = i18n('de', 'theme', { themePath: themeLocalesPath }).t;

      // Should fall back to returning the key itself since both files failed
      assert.equal(t('Read more'), 'Read more');
      assert.equal(t('Subscribe'), 'Subscribe');
    });

    it('ignores a symlinked locale file and falls back to English', async function () {
      // The symlink target is valid JSON, so only the symlink check can reject it.
      await fs.writeFile(
        path.join(themeLocalesPath, 'target.txt'),
        JSON.stringify({ 'Read more': 'Read more (symlink)' }),
      );
      await fs.symlink('target.txt', path.join(themeLocalesPath, 'fr.json'));
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify({ 'Read more': 'Read more (en)' }),
      );

      const instance = i18n('fr', 'theme', { themePath: themeLocalesPath });

      assert.equal(instance.t('Read more'), 'Read more (en)');
      assert.deepEqual((instance.store.data as Resources).fr.theme, {
        'Read more': 'Read more (en)',
      });
    });

    it('ignores a symlinked English fallback', async function () {
      await fs.writeFile(
        path.join(themeLocalesPath, 'target.txt'),
        JSON.stringify({ 'Read more': 'Read more (symlink)' }),
      );
      await fs.symlink('target.txt', path.join(themeLocalesPath, 'en.json'));

      const instance = i18n('en', 'theme', { themePath: themeLocalesPath });

      assert.deepEqual((instance.store.data as Resources).en.theme, {});
      assert.equal(instance.t('Read more'), 'Read more');
    });

    it('does not treat a directory named like a locale file as a locale', async function () {
      await fs.mkdir(path.join(themeLocalesPath, 'de.json'), { recursive: true });
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify({ 'Read more': 'Read more (en)' }),
      );

      const instance = i18n('fr', 'theme', { themePath: themeLocalesPath });

      // Only the requested locale and the English fallback should be registered.
      assert.deepEqual(Object.keys(instance.store.data).sort(), ['en', 'fr']);
      assert.equal(instance.t('Read more'), 'Read more (en)');
    });

    it('only reads locale files from inside the theme locales directory', async function () {
      const nested = path.join(themeLocalesPath, 'theme', 'locales');
      await fs.mkdir(nested, { recursive: true });
      await fs.writeFile(
        path.join(nested, 'en.json'),
        JSON.stringify({ 'Read more': 'Read more (en)' }),
      );
      await fs.writeFile(
        path.join(themeLocalesPath, 'secret.json'),
        JSON.stringify({ 'Read more': 'LEAKED' }),
      );

      const instance = i18n('../../secret', 'theme', { themePath: nested });

      assert.equal(instance.t('Read more'), 'Read more (en)');
    });

    it('ignores a locale containing a path separator', async function () {
      const nestedDirectory = path.join(themeLocalesPath, 'nested');
      await fs.mkdir(nestedDirectory, { recursive: true });
      await fs.writeFile(
        path.join(nestedDirectory, 'secret.json'),
        JSON.stringify({ 'Read more': 'LEAKED' }),
      );
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify({ 'Read more': 'Read more (en)' }),
      );

      const instance = i18n('nested/secret', 'theme', { themePath: themeLocalesPath });

      assert.equal(instance.t('Read more'), 'Read more (en)');
    });

    it('treats a `default` key as an ordinary translation, not a nested export', async function () {
      // Theme files are read with fs + JSON.parse, so they never carry the bundler
      // `default` wrapper that the bundled locales have to work around.
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify({
          'Read more': 'Read more directly',
          default: { 'Welcome message': 'Welcome from default' },
        }),
      );

      const instance = i18n('en', 'theme', { themePath: themeLocalesPath });

      assert.equal(instance.t('Read more'), 'Read more directly');
      assert.equal(instance.exists('Welcome message'), false);
      assert.equal(instance.t('Welcome message'), 'Welcome message');
      assert.equal(instance.exists('default'), false);
    });

    it('ignores a theme locale file that is valid JSON but not an object', async function () {
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify(['not', 'an', 'object']),
      );

      const instance = i18n('en', 'theme', { themePath: themeLocalesPath });

      assert.deepEqual((instance.store.data as Resources).en.theme, {});
      assert.equal(instance.t('Read more'), 'Read more');
    });

    it('drops non-string values from a theme locale file', async function () {
      // A theme author can put any JSON in a locale file. i18next renders a nested
      // object as the literal text "returned an object instead of string", so those
      // values must never reach the store as translations.
      await fs.writeFile(
        path.join(themeLocalesPath, 'en.json'),
        JSON.stringify({
          'Read more': 'Read more',
          Subscribe: { nested: 'object' },
          Count: 42,
        }),
      );

      const instance = i18n('en', 'theme', { themePath: themeLocalesPath });

      assert.equal(instance.t('Read more'), 'Read more');
      // Non-string values land as undefined, which i18next reports as missing, so
      // the key comes back instead of the diagnostic.
      assert.equal(instance.exists('Subscribe'), false);
      assert.equal(instance.t('Subscribe'), 'Subscribe');
      assert.equal(instance.exists('Count'), false);
      assert.equal(instance.t('Count'), 'Count');
    });

    it('initializes i18next with correct configuration', async function () {
      const enContent = {
        'Read more': 'Read more',
      };
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));

      const instance = i18n('fr', 'theme', { themePath: themeLocalesPath });

      // Verify i18next configuration
      assert.equal(instance.language, 'fr');
      assert.deepEqual(instance.options.ns, ['theme']);
      assert.equal(instance.options.defaultNS, 'theme');
      assert.equal(fallbackOf(instance).default[0], 'en');
      assert.equal(instance.options.returnEmptyString, false);

      // Verify resources are loaded correctly
      const resources = instance.store.data as Resources;
      assert(resources.fr);
      assert(resources.fr.theme);
      assert.equal(resources.fr.theme['Read more'], 'Read more');
    });

    it('interpolates variables in theme translations', async function () {
      const enContent = {
        'Welcome, {name}': 'Welcome, {name}',
        'Hello {firstName} {lastName}': 'Hello {firstName} {lastName}',
      };
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));

      const t = i18n('en', 'theme', { themePath: themeLocalesPath }).t;

      // Test simple interpolation
      assert.equal(t('Welcome, {name}', { name: 'John' }), 'Welcome, John');

      // Test multiple variables
      assert.equal(
        t('Hello {firstName} {lastName}', { firstName: 'John', lastName: 'Doe' }),
        'Hello John Doe',
      );
    });

    it('uses single curly braces for theme namespace interpolation', async function () {
      const enContent = {
        'Welcome, {name}': 'Welcome, {name}',
      };
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));

      const t = i18n('en', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(t('Welcome, {name}', { name: 'John' }), 'Welcome, John');
    });

    it('uses single curly braces for portal namespace interpolation', async function () {
      const t = i18n('en', 'portal').t;
      assert.equal(t('Welcome, {name}', { name: 'John' }), 'Welcome, John');
    });

    it('uses single curly braces for ghost namespace interpolation', async function () {
      const t = i18n('en', 'ghost').t;
      assert.equal(t('Welcome, {name}', { name: 'John' }), 'Welcome, John');
    });

    it('does not html encode interpolated values in the theme namespace', async function () {
      const enContent = {
        'Welcome, {name}': 'Welcome, {name}',
      };
      await fs.writeFile(path.join(themeLocalesPath, 'en.json'), JSON.stringify(enContent));
      const t = i18n('en', 'theme', { themePath: themeLocalesPath }).t;
      assert.equal(
        t('Welcome, {name}', { name: "<b>John O'Nolan</b>" }),
        "Welcome, <b>John O'Nolan</b>",
      );
    });
  });

  describe('i18next initialization', function () {
    it('initializes with correct default configuration', function () {
      const instance = i18n('en', 'portal');

      // Verify basic configuration
      assert.equal(instance.language, 'en');
      assert.deepEqual(instance.options.ns, ['portal']);
      assert.equal(instance.options.defaultNS, 'portal');
      assert.equal(fallbackOf(instance).default[0], 'en');
      assert.equal(instance.options.returnEmptyString, false);
      assert.equal(instance.options.nsSeparator, false);
      assert.equal(instance.options.keySeparator, false);

      // Verify interpolation configuration for portal namespace
      assert.equal(interpolationOf(instance).prefix, '{');
      assert.equal(interpolationOf(instance).suffix, '}');
    });

    it('initializes with correct theme configuration', function () {
      const instance = i18n('en', 'theme', { themePath: '/path/to/theme' });

      // Verify basic configuration
      assert.equal(instance.language, 'en');
      assert.deepEqual(instance.options.ns, ['theme']);
      assert.equal(instance.options.defaultNS, 'theme');
      assert.equal(fallbackOf(instance).default[0], 'en');
      assert.equal(instance.options.returnEmptyString, false);
      assert.equal(instance.options.nsSeparator, false);
      assert.equal(instance.options.keySeparator, false);

      // Verify interpolation configuration for theme namespace
      assert.equal(interpolationOf(instance).prefix, '{');
      assert.equal(interpolationOf(instance).suffix, '}');
    });

    it('initializes with correct newsletter (now ghost) configuration', function () {
      // note: we just merged newsletter into Ghost, so there might be some redundancy here
      const instance = i18n('en', 'ghost');

      // Verify basic configuration
      assert.equal(instance.language, 'en');
      assert.deepEqual(instance.options.ns, ['ghost']);
      assert.equal(instance.options.defaultNS, 'ghost');
      assert.equal(fallbackOf(instance).default[0], 'en');
      assert.equal(instance.options.returnEmptyString, false);
      assert.equal(instance.options.nsSeparator, false);
      assert.equal(instance.options.keySeparator, false);

      // Verify interpolation configuration for ghost namespace
      assert.equal(interpolationOf(instance).prefix, '{');
      assert.equal(interpolationOf(instance).suffix, '}');
    });

    it('initializes with correct fallback language configuration', function () {
      const instance = i18n('no', 'portal');

      // Verify Norwegian fallback chain
      assert.deepEqual(fallbackOf(instance).no, ['nb', 'en']);
      assert.deepEqual(fallbackOf(instance).default, ['en']);
    });

    it('initializes with empty theme resources when no theme path provided', function () {
      const instance = i18n('en', 'theme');

      // Verify empty theme resources
      assert.deepEqual(instance.store.data.en.theme, {});
    });
  });
});
