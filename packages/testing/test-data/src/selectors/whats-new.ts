/**
 * What's-new banner, menu and dialog selector strings, consumed by the admin
 * screen helpers and the e2e page objects. Source of truth:
 * apps/admin/src/whats-new plus the user-menu badges in
 * apps/admin/src/layout/app-sidebar/user-menu.tsx.
 */
export const whatsNewSelectors = {
    testIds: {
        banner: "whats-new-banner",
        bannerTitle: "whats-new-banner-title",
        bannerExcerpt: "whats-new-banner-excerpt",
        avatarBadge: "whats-new-avatar-badge",
        menuBadge: "whats-new-menu-badge",
        entry: "whats-new-entry",
        entryTitle: "whats-new-entry-title",
        entryExcerpt: "whats-new-entry-excerpt",
        entryImage: "whats-new-entry-image"
    },
    names: {
        /** The banner region's aria-label (curly apostrophe, as in the component). */
        banner: "What’s new notification",
        /** The shade Banner dismiss button's aria-label. */
        dismissButton: "Dismiss notification",
        /** The user-menu item and the dialog title share this label (curly apostrophe). */
        menuItem: "What’s new?",
        dialog: "What’s new?"
    }
} as const;
