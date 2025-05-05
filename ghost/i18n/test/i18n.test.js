const assert = require('assert/strict');
const fs = require('fs/promises');
const path = require('path');
const fsExtra = require('fs-extra');

const i18n = require('../');

describe('i18n', function () {
    it('does not have mismatched brackets in variables', async function () {
        for (const locale of i18n.SUPPORTED_LOCALES) {
            const translationFiles = await fs.readdir(path.join(`./locales/`, locale));

            for (const file of translationFiles) {
                const translationFile = require(path.join(`../locales/`, locale, file));

                for (const key of Object.keys(translationFile)) {
                    const keyStartCount = key.match(/{{/g)?.length;
                    assert.equal(keyStartCount, key.match(/}}/g)?.length, `[${locale}/${file}] mismatched brackets in ${key}`);

                    const value = translationFile[key];
                    if (typeof value === 'string') {
                        const valueStartCount = value.match(/{{/g)?.length;
                        assert.equal(valueStartCount, value.match(/}}/g)?.length, `[${locale}/${file}] mismatched brackets in ${value}`);

                        // Maybe enable in the future if we want to enforce this
                        //if (value !== '') {
                        //    assert.equal(keyStartCount, valueStartCount, `[${locale}/${file}] mismatched brackets between ${key} and ${value}`);
                        //}
                    }
                }
            }
        }
    });
    it('does not have too-long strings for the Stripe personal note label', async function () {
        for (const locale of i18n.SUPPORTED_LOCALES) {
            const translationFile = require(path.join(`../locales/`, locale, 'portal.json'));

            if (translationFile['Add a personal note']) {
                assert(translationFile['Add a personal note'].length <= 255, `[${locale}/portal.json] Stripe personal note label is too long`);
            }
        }
    });
    it('is uses default export if available', async function () {
        const translationFile = require(path.join(`../locales/`, 'nl', 'portal.json'));
        translationFile.Name = undefined;
        translationFile.default = {
            Name: 'Naam'
        };

        const t = i18n('nl', 'portal').t;
        assert.equal(t('Name'), 'Naam');
    });

    describe('Can use Portal resources', function () {
        describe('Dutch', function () {
            let t;

            before(function () {
                t = i18n('nl', 'portal').t;
            });

            it('can translate `Name`', function () {
                assert.equal(t('Name'), 'Naam');
            });
        });
    });

    describe('Can use Signup-form resources', function () {
        describe('Afrikaans', function () {
            let t;

            before(function () {
                t = i18n('af', 'signup-form').t;
            });

            it('can translate `Now check your email!`', function () {
                assert.equal(t('Now check your email!'), 'Kyk nou in jou e-pos!');
            });
        });
    });
    describe('Fallback when no language is chosen will be english', function () {
        describe('English fallback', function () {
            let t;
            before(function () {
                t = i18n().t;
            });
            it('can translate with english when no language selected', function () {
                assert.equal(t('Back'), 'Back');
            });
        });
    });

    describe('Fallback will be nb when no is chosen', function () {
        describe('Norwegian bokmål fallback', function () {
            let t;
            before(function () {
                t = i18n('no', 'portal').t;
            });
            it('Norwegian bokmål used when no is chosen', function () {
                assert.equal(t('Yearly'), 'Årlig');
            });
        });
    });

    describe('Language will be nb when nb is chosen', function () {
        describe('Norwegian bokmål', function () {
            let t;
            before(function () {
                t = i18n('nb', 'portal').t;
            });
            it('Norwegian bokmål used when "nb" is chosen', function () {
                assert.equal(t('Yearly'), 'Årlig');
            });
        });
    });
    describe('Language is properly "nn" when "nn" is chosen', function () {
        describe('Norwegian Nynorsk', function () {
            let t;
            before(function () {
                t = i18n('nn', 'portal').t;
            });
            it('Norwegian Nynorsk used when selected', function () {
                assert.equal(t('Yearly'), 'Årleg');
            });
        });
    });

    describe('directories and locales in i18n.js will match', function () {
        it('should have a key for each directory in the locales directory', async function () {
            const locales = await fs.readdir(path.join(__dirname, '../locales'));
            const supportedLocales = i18n.SUPPORTED_LOCALES;

            for (const locale of locales) {
                if (locale !== 'context.json') {
                    assert(supportedLocales.includes(locale), `The locale ${locale} is not in the list of supported locales`);
                }
            }
        });
        it('should have a directory for each key in lib/i18n.js', async function () {
            const supportedLocales = i18n.SUPPORTED_LOCALES;

            for (const locale of supportedLocales) {
                const localeDir = path.join(__dirname, `../locales/${locale}`);
                const stats = await fs.stat(localeDir);
                assert(stats.isDirectory(), `The locale ${locale} does not have a directory`);
            }
        });
    });
    describe('newsletter i18n', function () {
        it('should be able to translate and interpolate a date', async function () {
            const t = i18n('fr', 'newsletter').t;
            assert.equal(t('Your subscription will renew on {date}.', {date: '8 Oct 2024'}), 'Votre abonnement sera renouvelé le 8 Oct 2024.');
        });
    });
    describe('it gracefully falls back to en if a file is missing', function () {
        it('should be able to translate a key that is missing in the locale', async function () {
            const resources = i18n.generateResources(['xx'], 'portal');
            const englishResources = i18n.generateResources(['en'], 'portal');
            assert.deepEqual(resources.xx, englishResources.en);
        });
    });

    // i18n theme translations when feature flag is enabled
    describe('theme resources', function () {
        let themeLocalesPath;
        let cleanup;

        beforeEach(async function () {
            // Create a temporary theme locales directory
            themeLocalesPath = path.join(__dirname, 'temp-theme-locales');
            await fsExtra.ensureDir(themeLocalesPath);
            cleanup = async () => {
                await fsExtra.remove(themeLocalesPath);
            };
        });

        afterEach(async function () {
            await cleanup();
        });

        it('loads translations from theme locales directory', async function () {
            // Create test translation files
            const enContent = {
                'Read more': 'Read more',
                Subscribe: 'Subscribe'
            };
            const frContent = {
                'Read more': 'Lire plus',
                Subscribe: 'S\'abonner'
            };

            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);
            await fsExtra.writeJson(path.join(themeLocalesPath, 'fr.json'), frContent);

            const t = i18n('fr', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Read more'), 'Lire plus');
            assert.equal(t('Subscribe'), 'S\'abonner');
        });

        it('falls back to en when translation is missing', async function () {
            // Create only English translation file
            const enContent = {
                'Read more': 'Read more',
                Subscribe: 'Subscribe'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);

            const t = i18n('fr', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Read more'), 'Read more');
            assert.equal(t('Subscribe'), 'Subscribe');
        });

        it('uses empty translations when no files exist', async function () {
            const t = i18n('fr', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Read more'), 'Read more');
            assert.equal(t('Subscribe'), 'Subscribe');
        });

        it('handles invalid JSON files gracefully', async function () {
            // Create invalid JSON file
            await fsExtra.writeFile(path.join(themeLocalesPath, 'fr.json'), 'invalid json');

            const t = i18n('fr', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Read more'), 'Read more');
            assert.equal(t('Subscribe'), 'Subscribe');
        });

        it('initializes i18next with correct configuration', async function () {
            const enContent = {
                'Read more': 'Read more'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);

            const instance = i18n('fr', 'theme', {themePath: themeLocalesPath});

            // Verify i18next configuration
            assert.equal(instance.language, 'fr');
            assert.deepEqual(instance.options.ns, ['theme']);
            assert.equal(instance.options.defaultNS, 'theme');
            assert.equal(instance.options.fallbackLng.default[0], 'en');
            assert.equal(instance.options.returnEmptyString, false);

            // Verify resources are loaded correctly
            const resources = instance.store.data;
            assert(resources.fr);
            assert(resources.fr.theme);
            assert.equal(resources.fr.theme['Read more'], 'Read more');
        });

        it('handles interpolation correctly', async function () {
            const enContent = {
                'Welcome {name}': 'Welcome {name}'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);

            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Welcome {name}', {name: 'John'}), 'Welcome John');
        });

        it('interpolates variables in theme translations', async function () {
            const enContent = {
                'Welcome, {name}': 'Welcome, {name}',
                'Hello {firstName} {lastName}': 'Hello {firstName} {lastName}'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);

            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;

            // Test simple interpolation
            assert.equal(t('Welcome, {name}', {name: 'John'}), 'Welcome, John');

            // Test multiple variables
            assert.equal(
                t('Hello {firstName} {lastName}', {firstName: 'John', lastName: 'Doe'}),
                'Hello John Doe'
            );
        });

        it('uses single curly braces for theme namespace interpolation', async function () {
            const enContent = {
                'Welcome, {name}': 'Welcome, {name}'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);

            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Welcome, {name}', {name: 'John'}), 'Welcome, John');
        });

        it('uses double curly braces for portal namespace interpolation', async function () {
            const t = i18n('en', 'portal').t;
            assert.equal(t('Welcome, {{name}}', {name: 'John'}), 'Welcome, John');
        });

        it('uses single curly braces for newsletter namespace interpolation', async function () {
            const t = i18n('en', 'newsletter').t;
            assert.equal(t('Welcome, {name}', {name: 'John'}), 'Welcome, John');
        });
    });

    describe('i18next initialization', function () {
        it('initializes with correct default configuration', function () {
            const instance = i18n('en', 'portal');

            // Verify basic configuration
            assert.equal(instance.language, 'en');
            assert.deepEqual(instance.options.ns, ['portal']);
            assert.equal(instance.options.defaultNS, 'portal');
            assert.equal(instance.options.fallbackLng.default[0], 'en');
            assert.equal(instance.options.returnEmptyString, false);
            assert.equal(instance.options.nsSeparator, false);
            assert.equal(instance.options.keySeparator, false);

            // Verify interpolation configuration for portal namespace
            assert.equal(instance.options.interpolation.prefix, '{{');
            assert.equal(instance.options.interpolation.suffix, '}}');
        });

        it('initializes with correct theme configuration', function () {
            const instance = i18n('en', 'theme', {themePath: '/path/to/theme'});

            // Verify basic configuration
            assert.equal(instance.language, 'en');
            assert.deepEqual(instance.options.ns, ['theme']);
            assert.equal(instance.options.defaultNS, 'theme');
            assert.equal(instance.options.fallbackLng.default[0], 'en');
            assert.equal(instance.options.returnEmptyString, false);
            assert.equal(instance.options.nsSeparator, false);
            assert.equal(instance.options.keySeparator, false);

            // Verify interpolation configuration for theme namespace
            assert.equal(instance.options.interpolation.prefix, '{');
            assert.equal(instance.options.interpolation.suffix, '}');
        });

        it('initializes with correct newsletter configuration', function () {
            const instance = i18n('en', 'newsletter');

            // Verify basic configuration
            assert.equal(instance.language, 'en');
            assert.deepEqual(instance.options.ns, ['newsletter']);
            assert.equal(instance.options.defaultNS, 'newsletter');
            assert.equal(instance.options.fallbackLng.default[0], 'en');
            assert.equal(instance.options.returnEmptyString, false);
            assert.equal(instance.options.nsSeparator, false);
            assert.equal(instance.options.keySeparator, false);

            // Verify interpolation configuration for newsletter namespace
            assert.equal(instance.options.interpolation.prefix, '{');
            assert.equal(instance.options.interpolation.suffix, '}');
        });

        it('initializes with correct fallback language configuration', function () {
            const instance = i18n('no', 'portal');

            // Verify Norwegian fallback chain
            assert.deepEqual(instance.options.fallbackLng.no, ['nb', 'en']);
            assert.deepEqual(instance.options.fallbackLng.default, ['en']);
        });

        it('initializes with empty theme resources when no theme path provided', function () {
            const instance = i18n('en', 'theme');

            // Verify empty theme resources
            assert.deepEqual(instance.store.data.en.theme, {});
        });
    });
});

