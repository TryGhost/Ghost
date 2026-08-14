import {
    MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER,
    buildUserWithDismissedMultipleActiveSubscriptionsBanner,
    getMultipleActiveSubscriptionsBannerPreference,
    isMultipleActiveSubscriptionsFilter
} from '@/members/multiple-active-subscriptions';
import {buildMembersUrl} from '@/members/member-route';
import {toast} from 'sonner';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useEditUser} from '@tryghost/admin-x-framework/api/users';
import {useNavigate} from 'react-router';

interface UseMultipleActiveSubscriptionsBannerOptions {
    count: number;
    hasResolvedCount: boolean;
    nql?: string;
    search: string;
}

/**
 * Drives the banner warning that some members have active subscriptions across
 * multiple Stripe customers. Dismissal is stored per-user as the member count
 * at dismissal time, so the banner stays hidden until the count grows beyond
 * what the user last acknowledged.
 */
export function useMultipleActiveSubscriptionsBanner({
    count,
    hasResolvedCount,
    nql,
    search
}: UseMultipleActiveSubscriptionsBannerOptions) {
    const navigate = useNavigate();
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: editUser, isLoading: isDismissing} = useEditUser();
    const [optimisticDismissedCount, setOptimisticDismissedCount] = useState<number | null>(null);

    const isViewingFilter = isMultipleActiveSubscriptionsFilter(nql);
    // Only relevant on the unfiltered member list or when viewing the
    // affected members themselves — any other filter/search hides the banner.
    const shouldConsiderBanner = !search && (!nql || isViewingFilter);

    const preference = useMemo(() => {
        return getMultipleActiveSubscriptionsBannerPreference(currentUser?.accessibility);
    }, [currentUser?.accessibility]);
    const dismissedCount = optimisticDismissedCount ?? preference.dismissedCount ?? 0;
    // While viewing the filtered list the banner explains what's being shown,
    // so it can't be dismissed and ignores any previous dismissal.
    const canDismiss = !isViewingFilter;
    const shouldShow = shouldConsiderBanner
        && (
            isViewingFilter
            || count > dismissedCount
        );

    // When the member count shrinks below the stored dismissal count, lower the
    // stored count to match — otherwise fixing some members would leave enough
    // headroom for new occurrences to go unnoticed until the old high-water
    // mark is passed again.
    useEffect(() => {
        const storedDismissedCount = preference.dismissedCount;

        if (
            !currentUser
            || optimisticDismissedCount !== null
            || isDismissing
            || storedDismissedCount === undefined
            || !hasResolvedCount
            || count >= storedDismissedCount
        ) {
            return;
        }

        setOptimisticDismissedCount(count);

        editUser(buildUserWithDismissedMultipleActiveSubscriptionsBanner(
            currentUser,
            count,
            preference.dismissedAt ?? new Date().toISOString()
        )).then(() => {
            setOptimisticDismissedCount(null);
        }).catch((error) => {
            setOptimisticDismissedCount(null);
            // This keeps the preference in sync opportunistically; failing to sync should not interrupt the member list.
            // eslint-disable-next-line no-console
            console.log('Unable to update multiple active subscriptions banner dismissed count', error);
        });
    }, [
        count,
        currentUser,
        editUser,
        hasResolvedCount,
        isDismissing,
        optimisticDismissedCount,
        preference.dismissedAt,
        preference.dismissedCount
    ]);

    // Hides the banner immediately via optimistic state, then persists the
    // current count to the user's accessibility preferences.
    const handleDismiss = useCallback(() => {
        if (!currentUser || isDismissing) {
            return;
        }

        const previousDismissedCount = optimisticDismissedCount;

        setOptimisticDismissedCount(count);

        editUser(buildUserWithDismissedMultipleActiveSubscriptionsBanner(
            currentUser,
            count,
            new Date().toISOString()
        )).then(() => {
            setOptimisticDismissedCount(null);
        }).catch(() => {
            setOptimisticDismissedCount(previousDismissedCount);
            toast.error('Unable to dismiss notification. Please try again.');
        });
    }, [count, currentUser, editUser, isDismissing, optimisticDismissedCount]);

    const handleViewMembers = useCallback(() => {
        void navigate(buildMembersUrl({filter: MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER}));
    }, [navigate]);

    return {
        canDismiss,
        count,
        handleDismiss,
        handleViewMembers,
        shouldShow
    };
}
