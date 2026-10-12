/**
 * The app manifest: what an app tells Ghost about itself, and what a publisher agrees to
 * when installing it.
 *
 * Ghost core validates a manifest with `parseManifest` when it fetches one, and reads one
 * it has kept back with `AppManifestSchema`. Admin validates nothing itself: it only acts
 * on manifests Ghost has accepted, as the Admin API hands them over.
 *
 * The format is unversioned while only Ghost builds apps.
 */

export {
  compareManifests,
  type ManifestChange,
  type ManifestComparison,
  type ManifestVersion,
} from './compare.ts';
export { APP_ID_MAX_LENGTH, isValidAppId } from './id.ts';
export type { AppIcon } from './icon.ts';
export { URL_MAX_LENGTH } from './limits.ts';
export {
  parseManifest,
  parseManifestUrl,
  type ManifestError,
  type ParseManifestOptions,
  type ParseManifestResult,
  type ParseManifestUrlResult,
} from './parse.ts';
export {
  AppManifestSchema,
  type AppManifest,
  type AppSurface,
  type AppSurfaceType,
} from './schema.ts';
export { isLocalhost } from './localhost.ts';
export {
  appPageUrl,
  isDevelopmentApp,
  movedBetween,
  servedFrom,
  type AppMove,
  type ServedManifest,
} from './served-from.ts';
