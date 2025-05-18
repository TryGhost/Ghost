const assert = require('assert/strict');
const fs = require('fs/promises');
const path = require('path');

const i18n = require('../');
const {checkTranslationPair} = require('./utils');

describe('i18n', function () {
    it('does not have mismatched brackets in variables', async function () {
        for (const locale of i18n.SUPPORTED_LOCALES) {
            const translationFiles = await fs.readdir(path.join(`./locales/`, locale));

            for (const file of translationFiles) {
                const translationFile = require(path.join(`../locales/`, locale, file));

                for (const key of Object.keys(translationFile)) {
                    const keyStartCount = key.match(/{/g)?.length;
                    assert.equal(keyStartCount, key.match(/}/g)?.length, `[${locale}/${file}] mismatched brackets in ${key}`);

                    const value = translationFile[key];
                    if (typeof value === 'string') {
                        const valueStartCount = value.match(/{/g)?.length;
                        assert.equal(valueStartCount, value.match(/}/g)?.length, `[${locale}/${file}] mismatched brackets in ${value}`);

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
    describe('i18n-ignores are valid', function () {
        it('has valid structure with required fields', async function () {
            const ignores = require('./i18n-ignores.json');
           
            // Check top-level structure
            assert(ignores.overrides, 'i18n-ignores.json must have an "overrides" object');
            assert(Array.isArray(ignores.overrides.addedVariable), 'overrides.addedVariable must be an array');
            assert(Array.isArray(ignores.overrides.missingVariable), 'overrides.missingVariable must be an array');

            // Validate each entry in addedVariable
            for (const entry of ignores.overrides.addedVariable) {
                assert(entry.file, 'Each addedVariable entry must have a file field');
                assert(entry.key, 'Each addedVariable entry must have a key field');
            }

            // Validate each entry in missingVariable
            for (const entry of ignores.overrides.missingVariable) {
                assert(entry.file, 'Each missingVariable entry must have a file field');
                assert(entry.key, 'Each missingVariable entry must have a key field');
            }
        });
    });
    describe('translation files are valid', function () {
        it('there are no missing or added variables that are not documented in i18n-ignores.json', async function () {
            const ignores = require('./i18n-ignores.json');
            for (const locale of i18n.SUPPORTED_LOCALES) {
                const translationFiles = await fs.readdir(path.join(`./locales/`, locale));

                for (const file of translationFiles) {
                    const translationFile = require(path.join(`../locales/`, locale, file));
                    for (const key of Object.keys(translationFile)) {
                        const value = translationFile[key];
                        const result = checkTranslationPair(key, value, translationFile);
                        if (result.length > 0) {
                            // Check if all issues are covered by todos
                            const allIssuesCovered = result.every((issue) => {
                                const todo = ignores.overrides[issue].find(onetodo => onetodo.file === `${locale}/${file}` && onetodo.key === key);
                                return todo !== undefined;
                            });

                            assert(allIssuesCovered, 
                                `[${locale}/${file}]: "${key}" has issues: ${result.join(', ')}. ` +
                                `All issues and overridesmust be documented in i18n-ignores.json`
                            );
                        }
                    }
                }
            }
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
});
