import { assertValidKey, invalidImportFileKeyError } from '@tryghost/adapter-base-import-files';

// The imports that keep a file in the store. Kept here rather than in the base
// package so the package knows nothing about Ghost's consumers; HKG-1982 adds
// 'site-content-import'.
export type ImportKind = 'members-import' | 'content-csv-import';

/**
 * Compose the key an import stores its file under: `<kind>/<importId>/<name>`.
 * The import id is unique per import, so a fixed name per kind is enough and a
 * key is never written twice. Validated here so the request that composes the
 * key fails before anything is written.
 */
export function importFileKey(kind: ImportKind, importId: string, name: string): string {
  // One segment each, so the layout stays `<kind>/<importId>/<name>` and a
  // consumer cannot smuggle a deeper path through either part.
  if (importId.includes('/') || name.includes('/')) {
    throw invalidImportFileKeyError('an import id or file name must not contain "/"');
  }
  const key = `${kind}/${importId}/${name}`;
  assertValidKey(key);
  return key;
}
