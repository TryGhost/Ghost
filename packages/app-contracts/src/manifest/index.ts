/**
 * The app manifest: what an app tells Ghost about itself, and what a publisher agrees to
 * when installing it.
 *
 * Ghost core validates a manifest when it fetches one, and admin validates what it is
 * handed before acting on it. Both go through `parseManifest`, so they cannot disagree
 * about what a valid manifest is.
 *
 * The format is unversioned while only Ghost builds apps.
 */

export { APP_ID_MAX_LENGTH, isValidAppId } from './id.ts';
export type { AppIcon } from './icon.ts';
export { URL_MAX_LENGTH } from './limits.ts';
export {
  parseManifest,
  type ManifestError,
  type ParseManifestOptions,
  type ParseManifestResult,
} from './parse.ts';
export {
  AppManifestSchema,
  type AppManifest,
  type AppSurface,
  type AppSurfaceType,
} from './schema.ts';
