const assert = require('assert/strict');
const fs = require('fs/promises');
const path = require('path');

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
});
