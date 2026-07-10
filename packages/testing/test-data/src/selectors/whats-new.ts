/**
 * Selector strings for the admin what's-new banner, shared by every test
 * tier.
 *
 * Source of truth is the component source (apps/admin/src/whats-new). The
 * e2e page objects (e2e/helpers/pages/admin/whats-new) and the admin screen
 * helpers (apps/admin/src/whats-new/whats-new.screen.ts) both consume this
 * registry — strings only: no locators, no runner imports.
 */
export const whatsNewSelectors = {
    testIds: {
        banner: "whats-new-banner",
        bannerTitle: "whats-new-banner-title",
        bannerExcerpt: "whats-new-banner-excerpt"
    },
    /** Accessible names (aria-labels / visible control text). */
    names: {
        /** aria-label on the banner's status region (curly apostrophe, as in the component). */
        banner: "What’s new notification",
        /** The shade Banner dismiss button's aria-label. */
        dismissButton: "Dismiss notification"
    }
} as const;
