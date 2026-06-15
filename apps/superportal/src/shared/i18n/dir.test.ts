import {describe, it, expect} from 'vitest';
import {getDir} from './index';

describe('getDir', () => {
    it('returns rtl for RTL base locales', () => {
        for (const l of ['ar', 'fa', 'he', 'ur', 'ps', 'dv']) {
            expect(getDir(l)).toBe('rtl');
        }
    });

    it('matches the base subtag, ignoring region/script', () => {
        expect(getDir('ar-EG')).toBe('rtl');
        expect(getDir('fa_IR')).toBe('rtl');
        expect(getDir('AR')).toBe('rtl');
    });

    it('returns ltr for LTR and unknown locales', () => {
        for (const l of ['en', 'de', 'de-CH', 'sr-Cyrl', 'zz', '']) {
            expect(getDir(l)).toBe('ltr');
        }
    });
});
