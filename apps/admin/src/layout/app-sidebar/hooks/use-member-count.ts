import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canManageMembers } from "@tryghost/admin-x-framework/api/users";

/**
 * Hook to fetch the total member count efficiently.
 * Only fetches pagination metadata (limit=1) to minimize API overhead.
 * Automatically invalidates when members are created/updated/deleted in Ember.
 * Only fetches for users with member management permissions to avoid 403 errors.
 */
export function useMemberCount() {
    const { data: currentUser } = useCurrentUser();
    const hasPermission = currentUser ? canManageMembers(currentUser) : false;

    const { data: membersData } = useBrowseMembers({
        searchParams: { limit: '1' },
        enabled: hasPermission
    });

    return membersData?.meta?.pagination.total;
}

