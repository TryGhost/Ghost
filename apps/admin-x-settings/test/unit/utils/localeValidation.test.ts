import * as assert from 'assert/strict';
import {validateLocale} from '../../../src/utils/localeValidation';

describe('Locale Validation', () => {
    describe('Valid locale formats', () => {
        it('should accept simple language codes', () => {
            assert.equal(validateLocale('en'), null);
            assert.equal(validateLocale('fr'), null);
            assert.equal(validateLocale('de'), null);
            assert.equal(validateLocale('es'), null);
            assert.equal(validateLocale('ja'), null);
            assert.equal(validateLocale('zh'), null);
        });

        it('should accept language-region codes', () => {
            assert.equal(validateLocale('en-US'), null);
            assert.equal(validateLocale('en-GB'), null);
            assert.equal(validateLocale('fr-CA'), null);
            assert.equal(validateLocale('pt-BR'), null);
            assert.equal(validateLocale('es-MX'), null);
            assert.equal(validateLocale('de-CH'), null);
        });

        it('should accept language-script codes', () => {
            assert.equal(validateLocale('zh-Hant'), null);
            assert.equal(validateLocale('zh-Hans'), null);
            assert.equal(validateLocale('sr-Latn'), null);
            assert.equal(validateLocale('sr-Cyrl'), null);
            assert.equal(validateLocale('uz-Latn'), null);
            assert.equal(validateLocale('az-Cyrl'), null);
        });

        it('should accept language-script-region codes', () => {
            assert.equal(validateLocale('zh-Hant-TW'), null);
            assert.equal(validateLocale('zh-Hans-CN'), null);
            assert.equal(validateLocale('sr-Latn-RS'), null);
            assert.equal(validateLocale('uz-Cyrl-UZ'), null);
        });

        it('should accept private use tags', () => {
            assert.equal(validateLocale('x-private'), null);
            assert.equal(validateLocale('x-test'), null);
            assert.equal(validateLocale('x-custom-tag'), null);
        });

        it('should accept 3-letter language codes', () => {
            assert.equal(validateLocale('eng'), null);
            assert.equal(validateLocale('fra'), null);
            assert.equal(validateLocale('deu'), null);
        });

        it('should accept numeric region codes', () => {
            assert.equal(validateLocale('es-419'), null); // Latin America
            assert.equal(validateLocale('en-001'), null); // World
            assert.equal(validateLocale('ar-145'), null); // Western Asia
        });

        it('should accept variants', () => {
            assert.equal(validateLocale('ca-ES-valencia'), null);
            assert.equal(validateLocale('de-CH-1996'), null);
        });

        it('should accept extensions', () => {
            assert.equal(validateLocale('en-US-u-ca-buddhist'), null);
            assert.equal(validateLocale('th-TH-u-nu-thai'), null);
        });

        it('should accept grandfathered tags', () => {
            assert.equal(validateLocale('i-klingon'), null);
            assert.equal(validateLocale('zh-min-nan'), null);
            assert.equal(validateLocale('i-navajo'), null);
            assert.equal(validateLocale('i-default'), null);
            assert.equal(validateLocale('art-lojban'), null);
            assert.equal(validateLocale('cel-gaulish'), null);
            assert.equal(validateLocale('no-bok'), null);
            assert.equal(validateLocale('no-nyn'), null);
            assert.equal(validateLocale('zh-guoyu'), null);
            assert.equal(validateLocale('zh-hakka'), null);
            assert.equal(validateLocale('en-GB-oed'), null);
            assert.equal(validateLocale('sgn-BE-FR'), null);
        });

        it('should be case-insensitive', () => {
            assert.equal(validateLocale('EN'), null);
            assert.equal(validateLocale('en-us'), null);
            assert.equal(validateLocale('ZH-HANT'), null);
            assert.equal(validateLocale('Sr-LaTn-Rs'), null);
        });
    });

    describe('Invalid locale formats', () => {
        it('should reject invalid language names', () => {
            assert.equal(validateLocale('English'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('French'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('Spanish'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });

        it('should reject malformed locale codes', () => {
            assert.equal(validateLocale('invalid-format'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en_US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en-'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('-US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en--US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });

        it('should reject codes with invalid characters', () => {
            assert.equal(validateLocale('en@US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en!US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en/US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en\\US'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });

        it('should reject codes with incorrect lengths', () => {
            assert.equal(validateLocale('e'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('engl'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en-U'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en-USA'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });

        it('should reject numeric-only codes', () => {
            assert.equal(validateLocale('123'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('12-34'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });
    });

    describe('Empty values', () => {
        it('should require a value', () => {
            assert.equal(validateLocale(''), 'Locale is required');
        });

        it('should handle whitespace-only strings', () => {
            assert.equal(validateLocale('   '), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('\t'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('\n'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });
    });

    describe('Edge cases', () => {
        it('should handle very long but valid locale codes', () => {
            assert.equal(validateLocale('zh-Hant-CN-x-private-extension'), null);
            assert.equal(validateLocale('en-US-u-ca-buddhist-nu-thai'), null);
        });

        it('should handle special grandfathered tags correctly', () => {
            // These are special cases that don't follow normal BCP 47 patterns
            assert.equal(validateLocale('i-ami'), null);
            assert.equal(validateLocale('i-bnn'), null);
            assert.equal(validateLocale('i-enochian'), null);
            assert.equal(validateLocale('i-hak'), null);
            assert.equal(validateLocale('i-lux'), null);
            assert.equal(validateLocale('i-mingo'), null);
            assert.equal(validateLocale('i-pwn'), null);
            assert.equal(validateLocale('i-tao'), null);
            assert.equal(validateLocale('i-tay'), null);
            assert.equal(validateLocale('i-tsu'), null);
            assert.equal(validateLocale('sgn-BE-NL'), null);
            assert.equal(validateLocale('sgn-CH-DE'), null);
            assert.equal(validateLocale('zh-min'), null);
            assert.equal(validateLocale('zh-xiang'), null);
        });

        it('should handle locale codes with multiple extensions', () => {
            assert.equal(validateLocale('en-US-x-test1-test2'), null);
            assert.equal(validateLocale('fr-CA-x-private-custom'), null);
        });

        it('should reject locale codes that look valid but are not BCP 47 compliant', () => {
            assert.equal(validateLocale('eng-USA'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('en-United-States'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
            assert.equal(validateLocale('chinese-traditional'), 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private');
        });
    });
});