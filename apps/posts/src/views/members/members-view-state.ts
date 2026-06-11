const BULK_DELETE_RESTRICTED_FILTERS = [
    'subscriptions.plan_interval',
    'subscriptions.status',
    'subscriptions.start_date',
    'subscriptions.current_period_end',
    'conversion',
    'offer_redemptions'
];

type FilterLike = {
    field: string;
};

export function canBulkDeleteMembers(filters: FilterLike[], _nql?: string, hasUnknownFilters = false): boolean {
    // Unknown NQL clauses have no filter UI representation, so we can't vouch
    // for the bulk-destroy endpoint supporting them.
    if (hasUnknownFilters) {
        return false;
    }

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
