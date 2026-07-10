/**
 * What's-new banner selector strings, consumed by the admin screen helpers
 * and the e2e page objects. Source of truth: apps/admin/src/whats-new.
 */
export const whatsNewSelectors = {
    testIds: {
        banner: "whats-new-banner",
        bannerTitle: "whats-new-banner-title",
        bannerExcerpt: "whats-new-banner-excerpt"
    },
    names: {
        /** The banner region's aria-label (curly apostrophe, as in the component). */
        banner: "What’s new notification",
        /** The shade Banner dismiss button's aria-label. */
        dismissButton: "Dismiss notification"
    }
} as const;
