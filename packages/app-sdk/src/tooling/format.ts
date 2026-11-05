import { formatManifestErrors } from '@tryghost/app-contracts/manifest';

import type { ManifestError } from './types.ts';

/** A manifest's problems, one per line, as `path: message`, as Ghost lists them. */
export function formatErrors(errors: readonly ManifestError[], separator = '\n'): string {
  return formatManifestErrors(errors, separator);
}
