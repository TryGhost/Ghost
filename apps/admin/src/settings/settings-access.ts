import { canAccessSettings } from "@tryghost/admin-x-framework/api/users";
import { getStaffProfileSlug } from "@/settings/providers/routing/staff-profile-paths";
import type { AccessRule } from "@/route-access-guard";

const SETTINGS_PREFIX = /^\/settings\/?/;

// Roles without settings access still reach their own profile, the one settings
// path they own — see the modal paths the settings router registers for it.
export const canAccessSettingsRoute: AccessRule = (user, { pathname }) => {
    if (canAccessSettings(user)) {
        return true;
    }

    return getStaffProfileSlug(pathname.replace(SETTINGS_PREFIX, "")) === user.slug;
};
