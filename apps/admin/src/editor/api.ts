/**
 * Public surface of the editor domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the editor gate) and by the screens that open
 * the editor. Everything else in this domain is internal.
 */

import { preloadKoenig } from '@/settings/components/koenig-loader';

export { editorReturnState } from './editor-return';

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy()`, so a static re-export would pull the chunk into the shell bundle.
export const lazyEditorScreen = () => import('./editor-screen');
export const lazyRestoreScreen = () => import('./restore/restore-screen');

/** Fetches the editor screen and Koenig ahead of the first open. */
export function preloadEditor(): void {
  // A failure is left for the editor's own load to surface.
  lazyEditorScreen().catch(() => undefined);
  preloadKoenig().catch(() => undefined);
}
