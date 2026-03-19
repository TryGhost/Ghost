import {describe, expect, it} from 'vitest';
import {escapeNqlString} from './filter-normalization';

describe('filter-normalization', () => {
    it('escapes single quotes for NQL strings', () => {
        expect(escapeNqlString('can\'t stop')).toBe('\'can\\\'t stop\'');
    });

    it('escapes backslashes before single quotes for NQL strings', () => {
        expect(escapeNqlString('test\\\'value')).toBe('\'test\\\\\\\'value\'');
    });
});
