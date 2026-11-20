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

export {
  APP_FAILURE_CODES,
  OUTDATED_REVIEW_CODES,
  isAppFailureCode,
  isOutdatedReviewCode,
  type AppFailureCode,
} from './failure-codes.ts';
export {
  UNCONFIRMED_APP_CODES,
  isUnconfirmedAppCode,
  type UnconfirmedAppCode,
} from './identity/codes.ts';
export { isGhostHost } from './manifest/ghost-host.ts';
export { APP_ID_MAX_LENGTH, isValidAppId } from './manifest/id.ts';
export { URL_MAX_LENGTH } from './manifest/limits.ts';
export { isLocalhost } from './manifest/localhost.ts';
export { isPlainText, toPlainText } from './plain-text.ts';
export { appPageUrl, servedFrom } from './manifest/served-from.ts';
export {
  APP_RESOURCES,
  APP_SCOPES,
  APP_PERMISSION_KEYS,
  isAppPermissionKey,
  type AppResource,
  type AppResourceName,
  type AppScope,
  type AppPermissionKey,
  type AppPermissionKeyOf,
} from './scopes.ts';
export { describeScopes, type AccessLine } from './manifest/access.ts';
export type {
  AppIcon,
  AppManifest,
  AppSurface,
  AppSurfaceType,
  FieldChange,
  ManifestChange,
  ManifestError,
  ParseManifestOptions,
  ParseManifestResult,
  ParseManifestUrlResult,
  PublicKeyJwk,
} from './manifest/index.ts';
export {
  APP_ERROR_CODES,
  ARGUMENT_MESSAGES,
  BRIDGE_ERROR_CODES,
  CONNECT_MESSAGE_TYPE,
  FETCH_METHODS,
  FETCH_RESPONSE_STATUS_MAX,
  FETCH_RESPONSE_STATUS_MIN,
  HELLO_MESSAGE_TYPE,
  HOST_ERROR_CODES,
  START_TIMEOUT_MS,
  TITLE_MAX_LENGTH,
  decodeBridgeError,
  encodeBridgeError,
  isConnectMessage,
  isContainedPath,
  isFetchResponse,
  isLayout,
  isRecord,
  isReservedRequestHeader,
  isSafeArea,
  isStartContext,
  isTheme,
  methodAllowsBody,
  normaliseAppPath,
} from './bridge/rules.ts';
export type {
  AdminApiResource,
  AdminApiRouteGroup,
  AppErrorCode,
  AppExports,
  AppPath,
  BridgeErrorCode,
  ConnectMessage,
  FetchMethod,
  FetchRequest,
  FetchResponse,
  HelloMessage,
  HostErrorCode,
  HostExports,
  Layout,
  PathMove,
  Place,
  SafeArea,
  StartContext,
  Theme,
} from './bridge/index.ts';
