/**
 * Public surface of the automations domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAutomationsScreen = () => import('./automations');
export const lazyAutomationEditorScreen = () => import('./editor');
