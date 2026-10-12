/**
 * The contracts between Ghost and apps.
 *
 * Each contract is its own entry point (`@tryghost/app-contracts/manifest`, and later the
 * bridge, cards and live frames), so a consumer only loads the one it uses.
 *
 * This root entry point holds what every consumer can afford: types, and the rules that
 * depend on nothing. It must stay free of zod, because some consumers ship to browsers
 * that never validate anything. Validation lives in the contract's own entry point.
 */

export { APP_ID_MAX_LENGTH, isValidAppId } from './manifest/id.ts';
export { URL_MAX_LENGTH } from './manifest/limits.ts';
export { isLocalhost } from './manifest/localhost.ts';
export type {
  AppIcon,
  AppManifest,
  AppSurface,
  AppSurfaceType,
  ManifestError,
  ParseManifestOptions,
  ParseManifestResult,
} from './manifest/index.ts';
