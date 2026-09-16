// Node-only locale loader: reads one locale/namespace file off the on-disk
// locales tree. Kept out of ./i18n-core.ts so the browser build never sees `fs`.
//
// Read rather than `require`d on purpose: the CJS module cache pins a parsed
// locale for the lifetime of the process, so a locale that is no longer in use
// (after a locale change, or once the instance holding it is discarded) could
// never be collected. Nothing here outlives the i18next store that asked for it.
import fs from 'node:fs';
import path from 'node:path';

import type { ResourceLoader, TranslationResource } from './types.ts';

const LOCALES_DIRECTORY = path.resolve(import.meta.dirname, '../locales');

// Returns undefined for anything that isn't a readable locale file — including a
// `locale` that would escape the locales directory — and the core then falls back
// to English. Reads are cheap and rare: instances are built at boot, on a locale
// change, and on theme activation, not per request.
export const fileLoader: ResourceLoader = (locale, ns) => {
  // A locale names one directory directly inside the locales tree.
  const filePath = path.resolve(LOCALES_DIRECTORY, locale, `${ns}.json`);
  if (path.dirname(path.dirname(filePath)) !== LOCALES_DIRECTORY) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as TranslationResource;
  } catch {
    return undefined;
  }
};
