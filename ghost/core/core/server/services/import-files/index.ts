import type { ImportFileStore } from '@tryghost/adapter-base-import-files';

export { importFileKey, type ImportKind } from './keys';
export { withLocalCopy } from './local-copy';

// The one store this process uses. Held here so the imports receive it through
// their own wiring and never require the adapter manager themselves.
let store: ImportFileStore | undefined;

/**
 * Resolve the configured import file store. Boot calls this before the imports
 * that use it are wired; a store may be injected instead, for tests. Idempotent
 * because tests may boot more than once per process.
 */
export function init(injected?: ImportFileStore): void {
  if (store) {
    return;
  }

  // Required lazily: the adapter manager reads config on load.
  store = injected ?? require('../adapter-manager').default.getAdapter('import-files');
}

/**
 * The store the imports write to. Boot calls `init()` before they are wired; a
 * caller that wires an import without booting (an integration test building the
 * members service on its own) resolves the configured store the same way here,
 * exactly as the temp-file code it replaced needed nothing from boot.
 */
export function getStore(): ImportFileStore {
  if (!store) {
    init();
  }

  return store as ImportFileStore;
}
