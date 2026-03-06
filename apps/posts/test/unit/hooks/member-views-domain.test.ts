import {describe, expect, it} from 'vitest';
import {isViewSearchActive} from '@src/views/members/domain/member-views';

describe('member-views domain', () => {
    describe('isViewSearchActive', () => {
        it('returns true when view and current filter params match exactly', () => {
            expect(isViewSearchActive('?status=is%3Apaid', {status: 'is:paid'})).toBe(true);
        });

        it('returns false when current search has additional filter params', () => {
            expect(isViewSearchActive('?status=is%3Apaid&label=is%3Avip', {status: 'is:paid'})).toBe(false);
        });

        it('ignores non-filter params when matching', () => {
            expect(isViewSearchActive('?status=is%3Apaid&page=2&search=john', {status: 'is:paid'})).toBe(true);
        });

        it('returns false when any view param differs', () => {
            expect(isViewSearchActive('?status=is%3Afree&page=2', {status: 'is:paid'})).toBe(false);
        });

        it('ignores null filter values', () => {
            expect(isViewSearchActive('?status=is%3Apaid', {status: 'is:paid', label: null})).toBe(true);
        });

        it('treats multiselect values as equal regardless of order', () => {
            expect(isViewSearchActive('?label=is_any_of%3Ab%2Ca', {label: 'is_any_of:a,b'})).toBe(true);
        });

        it('supports dynamic newsletter keys', () => {
            expect(isViewSearchActive('?newsletters.weekly=is%3Asubscribed', {'newsletters.weekly': 'is:subscribed'})).toBe(true);
        });
    });
});
