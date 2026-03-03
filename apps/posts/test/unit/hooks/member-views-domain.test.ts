import {describe, expect, it} from 'vitest';
import {isViewSearchActive} from '@src/views/members/domain/member-views';

describe('member-views domain', () => {
    describe('isViewSearchActive', () => {
        it('returns true when all view params match and current search has extra params', () => {
            expect(isViewSearchActive('?status=is%3Apaid&page=2', {status: 'is:paid'})).toBe(true);
        });

        it('returns false when any view param differs', () => {
            expect(isViewSearchActive('?status=is%3Afree&page=2', {status: 'is:paid'})).toBe(false);
        });

        it('ignores null filter values', () => {
            expect(isViewSearchActive('?status=is%3Apaid', {status: 'is:paid', label: null})).toBe(true);
        });
    });
});
