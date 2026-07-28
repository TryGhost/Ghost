import { canAccessSettings } from "@tryghost/admin-x-framework/api/users";
import type { AccessRule } from "@/route-access-guard";

// Roles without settings access still reach their own profile through
// `settings/staff/:slug` — the modal paths registered in settings-router.tsx.
const OWN_PROFILE_PATH = /^\/settings\/staff\/([^/]+)(?:\/(edit|social-links|email-notifications))?\/?$/;

export const canAccessSettingsRoute: AccessRule = (user, { pathname }) => {
    if (canAccessSettings(user)) {
        return true;
    }

    const slug = pathname.match(OWN_PROFILE_PATH)?.[1];

    return slug === user.slug;
};
