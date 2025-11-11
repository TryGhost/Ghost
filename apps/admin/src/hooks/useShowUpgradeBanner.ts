import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { isOwnerUser } from "@tryghost/admin-x-framework/api/users";

/**
 * Hook to determine if the upgrade banner should be shown to the user
 * @returns {boolean} Whether to show the upgrade banner
 */
export function useShowUpgradeBanner(): boolean {
    const { data: currentUser } = useCurrentUser();
    const { data: config } = useBrowseConfig();

    // Only show Ghost(Pro) for owner users when billing is enabled
    // TODO: Add condition to only show the banner for people on trial
    if (!currentUser || !isOwnerUser(currentUser) || !config?.config.hostSettings?.billing?.enabled) {
        return false;
    }

    return true;
}
