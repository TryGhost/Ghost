/**
 * The app manifest: what an app tells Ghost about itself, and what a publisher agrees to
 * when installing it.
 *
 * Ghost core validates every manifest it accepts with `parseManifest`, and reads one it
 * has kept back with `AppManifestSchema`. Admin parses none: it acts on what the Admin API
 * hands over, and re-checks only the rule the app's sandbox depends on. Where it frames an
 * app's page, it checks the page is not on an origin Ghost is served from, as the site's
 * or Admin's URL can change after a manifest was accepted.
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
