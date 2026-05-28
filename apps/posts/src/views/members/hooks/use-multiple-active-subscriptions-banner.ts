import {
    MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER,
    buildUserWithDismissedMultipleActiveSubscriptionsBanner,
    getMultipleActiveSubscriptionsBannerPreference,
    isMultipleActiveSubscriptionsFilter
} from '../multiple-active-subscriptions';
import {buildMembersUrl} from '../member-route';
import {canManageMembers, useEditUser} from '@tryghost/admin-x-framework/api/users';
import {toast} from 'sonner';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useNavigate} from 'react-router';

interface UseMultipleActiveSubscriptionsBannerOptions {
    nql?: string;
    search: string;
}

export function useMultipleActiveSubscriptionsBanner({
    nql,
    search
}: UseMultipleActiveSubscriptionsBannerOptions) {
    const navigate = useNavigate();
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: editUser, isLoading: isDismissing} = useEditUser();
    const [optimisticDismissedCount, setOptimisticDismissedCount] = useState<number | null>(null);

    const canManageMemberList = currentUser ? canManageMembers(currentUser) : false;
    const isViewingFilter = isMultipleActiveSubscriptionsFilter(nql);
    const shouldConsiderBanner = !search && (!nql || isViewingFilter);

    const {
        data
    } = useBrowseMembers({
        searchParams: {
            filter: MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER,
            limit: '1',
            fields: 'id',
            order: 'id'
        },
        defaultErrorHandler: false,
        enabled: canManageMemberList && shouldConsiderBanner,
        refetchOnMount: 'always',
        staleTime: 0
    });

    const count = data?.meta?.pagination?.total ?? 0;
    const preference = useMemo(() => {
        return getMultipleActiveSubscriptionsBannerPreference(currentUser?.accessibility);
    }, [currentUser?.accessibility]);
    const dismissedCount = optimisticDismissedCount ?? preference.dismissedCount ?? 0;
    const canDismiss = !isViewingFilter;
    const shouldShow = shouldConsiderBanner
        && (
            isViewingFilter
            || count > dismissedCount
        );

    useEffect(() => {
        const storedDismissedCount = preference.dismissedCount;

        if (
            !currentUser
            || optimisticDismissedCount !== null
            || isDismissing
            || storedDismissedCount === undefined
            || data === undefined
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
        data,
        editUser,
        isDismissing,
        optimisticDismissedCount,
        preference.dismissedAt,
        preference.dismissedCount
    ]);

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
        navigate(buildMembersUrl({filter: MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER}));
    }, [navigate]);

    return {
        canDismiss,
        count,
        handleDismiss,
        handleViewMembers,
        shouldShow
    };
}
