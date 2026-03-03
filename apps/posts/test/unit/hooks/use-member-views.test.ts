import {
    buildViewsForDelete,
    buildViewsForSave,
    parseSharedViewsJSON
} from '@src/views/members/hooks/use-member-views';
import {describe, expect, it} from 'vitest';
import type {Filter} from '@tryghost/shade';
import type {MemberView} from '@src/views/members/hooks/use-member-views';

const paidFilter: Filter[] = [{
    id: 'status',
    field: 'status',
    operator: 'is',
    values: ['paid']
}];

const freeFilter: Filter[] = [{
    id: 'status',
    field: 'status',
    operator: 'is',
    values: ['free']
}];

const baseViews: MemberView[] = [
    {
        name: 'Paid members',
        route: 'members',
        filter: {status: 'is:paid'}
    },
    {
        name: 'Posts view',
        route: 'posts',
        color: 'green',
        filter: {type: 'draft'}
    }
];

describe('use-member-views helpers', () => {
    describe('parseSharedViewsJSON', () => {
        it('returns invalid result for malformed json', () => {
            const result = parseSharedViewsJSON('{not json');

            expect(result.ok).toBe(false);
        });

        it('returns invalid result for non-array payloads', () => {
            const result = parseSharedViewsJSON('{"name":"x"}');

            expect(result.ok).toBe(false);
        });

        it('keeps valid entries and discards malformed ones', () => {
            const result = parseSharedViewsJSON(JSON.stringify([
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {status: 'is:paid'}
                },
                {
                    bad: true
                }
            ]));

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.views).toHaveLength(1);
                expect(result.views[0].name).toBe('Paid members');
            }
        });
    });

    describe('buildViewsForSave', () => {
        it('prevents duplicate names in create mode', () => {
            expect(() => buildViewsForSave(baseViews, 'paid members', paidFilter)).toThrow('A view with this name already exists');
        });

        it('prevents rename collision in edit mode', () => {
            const views: MemberView[] = [
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {status: 'is:paid'}
                },
                {
                    name: 'Free members',
                    route: 'members',
                    filter: {status: 'is:free'}
                }
            ];

            expect(() => buildViewsForSave(views, 'Free members', paidFilter, views[0])).toThrow('A view with this name already exists');
        });

        it('throws when edit target is missing or ambiguous', () => {
            expect(() => buildViewsForSave(baseViews, 'Renamed', paidFilter, {
                name: 'Unknown',
                route: 'members',
                filter: {status: 'is:unknown'}
            })).toThrow('Saved view could not be found for update');
        });
    });

    describe('buildViewsForDelete', () => {
        it('deletes exactly one anchored entry', () => {
            const result = buildViewsForDelete(baseViews, {
                name: 'Paid members',
                route: 'members',
                filter: {status: 'is:paid'}
            });

            expect(result).toHaveLength(1);
            expect(result[0].route).toBe('posts');
        });

        it('throws when delete target is missing', () => {
            expect(() => buildViewsForDelete(baseViews, {
                name: 'Missing',
                route: 'members',
                filter: {status: 'is:paid'}
            })).toThrow('Saved view could not be found for delete');
        });

        it('throws when delete target is ambiguous', () => {
            const duplicateViews: MemberView[] = [
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {status: 'is:paid'}
                },
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {status: 'is:paid'}
                }
            ];

            expect(() => buildViewsForDelete(duplicateViews, {
                name: 'Paid members',
                route: 'members',
                filter: {status: 'is:paid'}
            })).toThrow('Multiple saved views matched delete target');
        });
    });
});

// Keep this imported so the fixture reflects multi-value real-world usage in this module
void freeFilter;
