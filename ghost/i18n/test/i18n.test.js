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
});
