/**
 * Public surface of the editor domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx via the editor gate). Everything else in this
 * domain is internal.
 */

// Lazy entry, not a component re-export: the shell mounts this behind
// `lazy()`, so a static re-export would pull the chunk into the shell bundle.
export const lazyEditorScreen = () => import('./editor-screen');
