/**
 * Public surface of the whats-new domain, consumed by the admin layout
 * (apps/admin/src/layout). Everything else in this domain is internal.
 */
export { default as WhatsNewBanner } from './components/whats-new-banner';
export { default as WhatsNewDialog } from './components/whats-new-dialog';
export { useChangelog } from './hooks/use-changelog';
export { useWhatsNew } from './hooks/use-whats-new';
