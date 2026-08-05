// The staff profile modal is the one settings surface roles without settings
// access can reach, so its paths are consumed both by the settings router and
// by the admin shell's route access rules. Keep them derived from this list
// rather than restated, or a new tab renders for admins and redirects everyone
// else. No imports: the shell loads this eagerly, outside the settings chunk.

const STAFF_PROFILE_TABS = ['edit', 'social-links', 'email-notifications'] as const;

export const staffProfileModalPaths: string[] = [
    ...STAFF_PROFILE_TABS.map(tab => `staff/:slug/${tab}`),
    'staff/:slug'
];

const STAFF_PROFILE_PATH = new RegExp(`^staff/([^/]+)(?:/(?:${STAFF_PROFILE_TABS.join('|')}))?/?$`);

/**
 * The slug whose profile a settings-relative path addresses, e.g.
 * `staff/jo/social-links` → `jo`. Undefined for anything else in settings.
 */
export function getStaffProfileSlug(settingsPath: string): string | undefined {
    return settingsPath.match(STAFF_PROFILE_PATH)?.[1];
}
