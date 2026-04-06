const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const fsExtra = require('fs-extra');
const i18n = require('../');

describe('i18n', function () {
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
            const t = i18n('fr', 'ghost').t;
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
                        assert.fail(`Empty value found at ${currentPath}. If you added a new key for translation, please add it to the ghost/i18n/locales/context.json file.`);
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

        it('handles errors when both requested locale and English fallback files are invalid', async function () {
            // Create invalid JSON files for both requested locale and English fallback
            await fsExtra.writeFile(path.join(themeLocalesPath, 'de.json'), 'invalid json');
            await fsExtra.writeFile(path.join(themeLocalesPath, 'en.json'), 'also invalid json');

            const t = i18n('de', 'theme', {themePath: themeLocalesPath}).t;

            // Should fall back to returning the key itself since both files failed
            assert.equal(t('Read more'), 'Read more');
            assert.equal(t('Subscribe'), 'Subscribe');
        });

        it('handles theme files with TypeScript default export structure', async function () {
            // Create a theme translation file that mimics TypeScript's default export behavior
            // where translations are nested under a 'default' property
            const themeContent = {
                'Read more': 'Read more directly',
                Subscribe: 'Subscribe directly',
                default: {
                    'Welcome message': 'Welcome from default',
                    'Footer text': 'Footer from default'
                }
            };

            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), themeContent);

            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;

            // Should be able to access both direct properties and properties from the default export
            assert.equal(t('Read more'), 'Read more directly');
            assert.equal(t('Subscribe'), 'Subscribe directly');
            assert.equal(t('Welcome message'), 'Welcome from default');
            assert.equal(t('Footer text'), 'Footer from default');
        });

        it('handles theme files with non-object default export', async function () {
            // Create a theme translation file where the default export is not an object
            const themeContent = {
                'Read more': 'Read more',
                Subscribe: 'Subscribe',
                default: 'not an object'
            };

            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), themeContent);

            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;

            // Should only use direct properties, ignoring the non-object default export
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

        it('uses single curly braces for portal namespace interpolation', async function () {
            const t = i18n('en', 'portal').t;
            assert.equal(t('Welcome, {name}', {name: 'John'}), 'Welcome, John');
        });

        it('uses single curly braces for ghost namespace interpolation', async function () {
            const t = i18n('en', 'ghost').t;
            assert.equal(t('Welcome, {name}', {name: 'John'}), 'Welcome, John');
        });

        it('does not html encode interpolated values in the theme namespace', async function () {
            const enContent = {
                'Welcome, {name}': 'Welcome, {name}'
            };
            await fsExtra.writeJson(path.join(themeLocalesPath, 'en.json'), enContent);
            const t = i18n('en', 'theme', {themePath: themeLocalesPath}).t;
            assert.equal(t('Welcome, {name}', {name: '<b>John O\'Nolan</b>'}), 'Welcome, <b>John O\'Nolan</b>');
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
            assert.equal(instance.options.interpolation.prefix, '{');
            assert.equal(instance.options.interpolation.suffix, '}');
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

        it('initializes with correct newsletter (now ghost) configuration', function () {
            // note: we just merged newsletter into Ghost, so there might be some redundancy here
            const instance = i18n('en', 'ghost');

            // Verify basic configuration
            assert.equal(instance.language, 'en');
            assert.deepEqual(instance.options.ns, ['ghost']);
            assert.equal(instance.options.defaultNS, 'ghost');
            assert.equal(instance.options.fallbackLng.default[0], 'en');
            assert.equal(instance.options.returnEmptyString, false);
            assert.equal(instance.options.nsSeparator, false);
            assert.equal(instance.options.keySeparator, false);

            // Verify interpolation configuration for ghost namespace
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
