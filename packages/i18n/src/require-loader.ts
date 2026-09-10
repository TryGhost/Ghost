// Node-only locale loader: dynamic require against the on-disk locales tree.
// Kept out of ./i18n-core.ts so the browser build never sees a dynamic require.
import { createRequire } from 'node:module';

import type { ResourceLoader, TranslationResource } from './types.ts';

const requireJson = createRequire(import.meta.url);

export const requireLoader: ResourceLoader = (locale, ns) => {
  try {
    return requireJson(`../locales/${locale}/${ns}.json`) as TranslationResource;
  } catch {
    return requireJson(`../locales/en/${ns}.json`) as TranslationResource;
  }
};
