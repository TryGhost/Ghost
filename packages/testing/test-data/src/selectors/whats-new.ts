/**
 * What's-new banner, menu and dialog selector strings, consumed by the admin
 * screen helpers and the e2e page objects. Source of truth:
 * apps/admin/src/whats-new plus the user-menu badges in
 * apps/admin/src/layout/app-sidebar/user-menu.tsx.
 */

// testids
export const whatsNewBanner = "whats-new-banner";
export const whatsNewBannerTitle = "whats-new-banner-title";
export const whatsNewBannerExcerpt = "whats-new-banner-excerpt";
export const whatsNewAvatarBadge = "whats-new-avatar-badge";
export const whatsNewMenuBadge = "whats-new-menu-badge";
export const whatsNewEntry = "whats-new-entry";
export const whatsNewEntryTitle = "whats-new-entry-title";
export const whatsNewEntryExcerpt = "whats-new-entry-excerpt";
export const whatsNewEntryImage = "whats-new-entry-image";

// accessible names
/** The banner region's aria-label (curly apostrophe, as in the component). */
export const bannerLabel = "What’s new notification";
/** The shade Banner dismiss button's aria-label. */
export const dismissButton = "Dismiss notification";
/** The user-menu item and the dialog title share this label (curly apostrophe). */
export const whatsNewMenuItem = "What’s new?";
export const whatsNewDialog = "What’s new?";
