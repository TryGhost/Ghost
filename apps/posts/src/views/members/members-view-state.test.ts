import {canBulkDeleteMembers, shouldShowMembersLoading} from './members-view-state';
import {describe, expect, it} from 'vitest';

describe('members-view-state', () => {
    it('keeps showing the loading state during non-pagination refetches', () => {
        expect(shouldShowMembersLoading({
            isFetching: true,
            isFetchingNextPage: false
        })).toBe(true);
    });

    it('disables bulk delete when preserving a raw restricted filter', () => {
        expect(canBulkDeleteMembers([], '(subscriptions.status:active,status:free)')).toBe(false);
    });

    it('disables bulk delete for filters preserved as unknown NQL clauses', () => {
        expect(canBulkDeleteMembers([], 'count.active_stripe_customers:>1')).toBe(false);
        expect(canBulkDeleteMembers([{field: 'status'}], 'status:paid+count.active_stripe_customers:>1', true)).toBe(false);
    });
});
