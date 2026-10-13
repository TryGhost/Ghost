/**
 * The contracts between Ghost and apps.
 *
 * Each contract is its own entry point (`@tryghost/app-contracts/manifest`,
 * `@tryghost/app-contracts/bridge`, and later cards and live frames), so a consumer only
 * loads the one it uses.
 *
 * This root entry point holds what every consumer can afford: types, and the rules that
 * depend on nothing. It must stay free of zod, because some consumers ship to browsers
 * that never validate anything. Validation lives in the contract's own entry point.
 */

export { isGhostOrigin } from './manifest/ghost-origin.ts';
export { APP_ID_MAX_LENGTH, isValidAppId } from './manifest/id.ts';
export { URL_MAX_LENGTH } from './manifest/limits.ts';
export { isLocalhost } from './manifest/localhost.ts';
export {
  appPageUrl,
  isDevelopmentApp,
  movedBetween,
  servedFrom,
  type AppMove,
  type ServedManifest,
} from './manifest/served-from.ts';
export type {
  AppIcon,
  AppManifest,
  AppSurface,
  AppSurfaceType,
  ManifestError,
  ParseManifestOptions,
  ParseManifestResult,
  ParseManifestUrlResult,
} from './manifest/index.ts';
export type {
  AppExports,
  AppPath,
  BlockedAdminApiCategory,
  ConnectMessage,
  FetchMethod,
  FetchRequest,
  FetchResponse,
  HelloMessage,
  HostExports,
  PathChangeOptions,
  Place,
  StartContext,
  Theme,
} from './bridge/index.ts';
