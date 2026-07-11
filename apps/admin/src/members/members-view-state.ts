import {MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD} from './multiple-active-subscriptions';

const BULK_DELETE_RESTRICTED_FILTERS = [
    'subscriptions.plan_interval',
    'subscriptions.status',
    'subscriptions.start_date',
    'subscriptions.current_period_end',
    'conversion',
    'offer_redemptions',
    MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD
];

type FilterLike = {
    field: string;
};

export function canBulkDeleteMembers(filters: FilterLike[], _nql?: string): boolean {
    if (_nql && filters.length === 0) {
        return false;
    }

    return !filters.some(filter => BULK_DELETE_RESTRICTED_FILTERS.includes(filter.field));
}

export function shouldShowMembersLoading({
    isFetching,
    isFetchingNextPage
}: {
    isFetching: boolean;
    isFetchingNextPage: boolean;
}): boolean {
    return isFetching && !isFetchingNextPage;
}
