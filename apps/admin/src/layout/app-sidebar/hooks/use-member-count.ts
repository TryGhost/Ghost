import { memberCountSearchParams, useBrowseMembers } from "@tryghost/admin-x-framework/api/members";

/**
 * Hook to fetch the total member count efficiently.
 * Only fetches pagination metadata (limit=1) to minimize API overhead.
 * Automatically invalidates when members are created/updated/deleted in Ember.
 */
export function useMemberCount() {
    const { data: membersData } = useBrowseMembers({
        searchParams: memberCountSearchParams
    });
    
    return membersData?.meta?.pagination.total;
}
