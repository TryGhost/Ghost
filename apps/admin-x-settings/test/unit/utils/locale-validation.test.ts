import * as assert from 'assert/strict';
import {validateLocale} from '@src/utils/locale-validation';

describe('validateLocale', function () {
    describe('valid locales', function () {
        it('accepts simple two-letter language codes', function () {
            const result = validateLocale('en');
            assert.equal(result, null);
        });

        it('accepts three-letter language codes', function () {
            const result = validateLocale('eng');
            assert.equal(result, null);
        });

        it('accepts language with region', function () {
            assert.equal(validateLocale('en-US'), null);
            assert.equal(validateLocale('pt-BR'), null);
            assert.equal(validateLocale('zh-CN'), null);
        });

        it('accepts language with script', function () {
            assert.equal(validateLocale('zh-Hans'), null);
            assert.equal(validateLocale('zh-Hant'), null);
            assert.equal(validateLocale('sr-Latn'), null);
        });

        it('accepts language with script and region', function () {
            assert.equal(validateLocale('zh-Hans-CN'), null);
            assert.equal(validateLocale('sr-Latn-RS'), null);
        });

        it('accepts private use tags', function () {
            assert.equal(validateLocale('x-custom'), null);
            assert.equal(validateLocale('x-private'), null);
        });

        it('accepts language with private use extension', function () {
            assert.equal(validateLocale('en-x-custom'), null);
        });

        it('accepts numeric region codes', function () {
            assert.equal(validateLocale('es-419'), null);
        });

        it('accepts variant subtags', function () {
            assert.equal(validateLocale('sl-rozaj'), null);
            assert.equal(validateLocale('de-CH-1901'), null);
        });

        it('is case-insensitive', function () {
            assert.equal(validateLocale('EN'), null);
            assert.equal(validateLocale('en-us'), null);
            assert.equal(validateLocale('ZH-HANS'), null);
        });

        it('trims whitespace', function () {
            assert.equal(validateLocale('  en  '), null);
        });

        it('accepts grandfathered tags', function () {
            assert.equal(validateLocale('i-klingon'), null);
            assert.equal(validateLocale('zh-min-nan'), null);
            assert.equal(validateLocale('en-GB-oed'), null);
        });
    });

    describe('invalid locales', function () {
        it('rejects empty strings', function () {
            const result = validateLocale('');
            assert.equal(result, 'Enter a value');
        });

        it('rejects whitespace-only strings', function () {
            const result = validateLocale('   ');
            assert.equal(typeof result, 'string');
        });

        it('rejects single character language codes', function () {
            const result = validateLocale('e');
            assert.equal(typeof result, 'string');
        });

        it('rejects language codes longer than 3 characters', function () {
            const result = validateLocale('english');
            assert.equal(typeof result, 'string');
        });

        it('rejects codes starting with hyphen', function () {
            const result = validateLocale('-en');
            assert.equal(typeof result, 'string');
        });

        it('rejects codes ending with hyphen', function () {
            const result = validateLocale('en-');
            assert.equal(typeof result, 'string');
        });

        it('rejects consecutive hyphens', function () {
            const result = validateLocale('en--US');
            assert.equal(typeof result, 'string');
        });

        it('rejects invalid characters', function () {
            const result = validateLocale('en_US');
            assert.equal(typeof result, 'string');
        });

        it('rejects special characters', function () {
            assert.notEqual(validateLocale('en@US'), null);
            assert.notEqual(validateLocale('en.US'), null);
            assert.notEqual(validateLocale('en/US'), null);
        });

        it('rejects common English words', function () {
            assert.notEqual(validateLocale('english'), null);
            assert.notEqual(validateLocale('french'), null);
            assert.notEqual(validateLocale('spanish'), null);
        });
    });
});
