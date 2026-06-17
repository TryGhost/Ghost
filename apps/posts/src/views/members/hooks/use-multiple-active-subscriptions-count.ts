import {MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER} from '../multiple-active-subscriptions';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';

interface UseMultipleActiveSubscriptionsCountOptions {
    enabled: boolean;
}

/**
 * Counts the members that have active subscriptions across multiple Stripe
 * customers. Count-only query: we just need pagination.total, not the members.
 */
export function useMultipleActiveSubscriptionsCount({enabled}: UseMultipleActiveSubscriptionsCountOptions) {
    const {data} = useBrowseMembers({
        searchParams: {
            filter: MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER,
            limit: '1',
            fields: 'id',
            order: 'id'
        },
        defaultErrorHandler: false,
        enabled,
        refetchOnMount: 'always',
        staleTime: 0
    });

    return {
        count: data?.meta?.pagination?.total ?? 0,
        hasResolvedCount: data !== undefined
    };
}
