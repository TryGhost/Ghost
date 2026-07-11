/**
 * Admin sidebar selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/layout/app-sidebar.
 */
export const sidebarSelectors = {
    testIds: {
        networkBadge: "network-notification-badge"
    },
    names: {
        postsToggle: "Toggle post views",
        userMenuTrigger: "User menu",
        profileMenuItem: "Your profile",
        signOutMenuItem: "Sign out",
        /** The appearance item's accessible name includes the current choice ("Appearance Light"). */
        appearanceMenuItem: "Appearance",
        darkAppearanceOption: "Dark appearance",
        lightAppearanceOption: "Light appearance",
        systemAppearanceOption: "System appearance",
        themeErrorsDialog: "Theme errors",
        ghostProLink: "Ghost(Pro)",
        upgradeNowLink: "Upgrade now"
    },
    text: {
        themeErrorsBanner: "Your theme has errors"
    }
} as const;
