/**
 * Public surface of the editor domain, consumed by the admin shell and other
 * domains. Everything else in this domain is internal.
 */

export { editorReturnState } from './editor-return';

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy()`, so a static re-export would pull the chunk into the shell bundle.
export const lazyEditorScreen = () => import('./editor-screen');
export const lazyRestoreScreen = () => import('./restore/restore-screen');

// Read-only content helpers can be shared without mounting the editor.
export { parseLexical } from './engine/lexical-compare';
export { htmlToText } from './session/content-text';
