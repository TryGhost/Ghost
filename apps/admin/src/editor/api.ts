/**
 * Public surface of the editor domain, consumed by the admin shell and other
 * domains. Everything else in this domain is internal.
 */

// Lazy entry, not a component re-export: the shell mounts this behind
// `lazy()`, so a static re-export would pull the chunk into the shell bundle.
export const lazyEditorScreen = () => import('./editor-screen');

// Read-only content helpers can be shared without mounting the editor.
export { parseLexical } from './engine/lexical-compare';
export { htmlToText } from './session/content-text';
