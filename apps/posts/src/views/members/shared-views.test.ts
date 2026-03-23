import {
    type SharedView,
    findMatchingSharedViewIndexes,
    hasSharedViewNameConflict,
    isSharedViewEqual
} from './shared-views';
import {describe, expect, it} from 'vitest';

describe('shared-views', () => {
    describe('isSharedViewEqual', () => {
        it('matches views by route and filter payload', () => {
            const left: SharedView = {
                name: 'Paid members',
                route: 'members',
                filter: {filter: 'status:paid'}
            };
            const right: SharedView = {
                name: 'VIP members',
                route: 'members',
                filter: {filter: 'status:paid'}
            };

            expect(isSharedViewEqual(left, right)).toBe(true);
        });

        it('does not match when the route differs', () => {
            const left: SharedView = {
                name: 'Paid members',
                route: 'members',
                filter: {filter: 'status:paid'}
            };
            const right: SharedView = {
                name: 'Paid posts',
                route: 'posts',
                filter: {filter: 'status:paid'}
            };

            expect(isSharedViewEqual(left, right)).toBe(false);
        });
    });

    describe('findMatchingSharedViewIndexes', () => {
        it('returns indexes for views with the same route and filter payload', () => {
            const target: SharedView = {
                name: 'Paid members',
                route: 'members',
                filter: {filter: 'status:paid'}
            };

            expect(findMatchingSharedViewIndexes([
                target,
                {
                    name: 'VIP members',
                    route: 'members',
                    filter: {filter: 'label:[vip]'}
                },
                {
                    name: 'Another paid members',
                    route: 'members',
                    filter: {filter: 'status:paid'}
                }
            ], target)).toEqual([0, 2]);
        });
    });

    describe('hasSharedViewNameConflict', () => {
        it('checks duplicate names within the same route only', () => {
            expect(hasSharedViewNameConflict([
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {filter: 'status:paid'}
                },
                {
                    name: 'Paid members',
                    route: 'posts',
                    filter: {type: 'draft'}
                }
            ], {
                name: 'paid members',
                route: 'members'
            })).toBe(true);
        });

        it('ignores the excluded index when checking duplicate names', () => {
            expect(hasSharedViewNameConflict([
                {
                    name: 'Paid members',
                    route: 'members',
                    filter: {filter: 'status:paid'}
                }
            ], {
                name: 'paid members',
                route: 'members'
            }, 0)).toBe(false);
        });
    });
});
