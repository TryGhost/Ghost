/**
 * The bridge: the channel between Admin and an app's page, which Admin shows in a frame.
 *
 * Admin and the SDK talk over a `MessagePort`. Admin hands the port to the frame once the SDK
 * in it has sent a hello from the right origin. This entry point holds what both sides agree
 * on: the two window messages that set up the channel, the calls each side exposes, the
 * validation Admin applies to every argument from the untrusted frame, and what the fetch
 * escape hatch may reach and what it still refuses because Ghost's server doesn't yet
 * (`checkAdminApiRequest`, the app routes and the server gaps).
 *
 * The root entry point also exports the zod-free rules in `rules.ts`, for the SDK.
 */

export { APP_ROUTES, scopesOpening, serverGapsFor } from './app-routes.ts';
export type { AppExports, HostExports } from './exports.ts';
export {
  FETCH_BODY_MAX_BYTES,
  FETCH_PATH_MAX_LENGTH,
  FetchRequestSchema,
  type FetchRequest,
} from './fetch.ts';
export { HelloMessageSchema, type HelloMessage } from './messages.ts';
export { APP_PATH_MAX_LENGTH, AppPathSchema, PathMoveSchema, type AppPath } from './paths.ts';
export { OverlayOptionsSchema, type OverlayOptions } from './overlay.ts';
export { PlaceSchema } from './places.ts';
export { QUERY_PARAMETER_LIMIT, readQuery, type Query } from './query.ts';

export {
  checkAdminApiRequest,
  type AdminApiRequest,
  type AdminApiRequestCheck,
} from './resolve.ts';
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
  OVERLAY_FRAME_NAME,
  OVERLAY_TINTS,
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
  type AppErrorCode,
  type BridgeErrorCode,
  type ConnectMessage,
  type FetchMethod,
  type FetchResponse,
  type HostErrorCode,
  type Layout,
  type OverlayTint,
  type PathMove,
  type Place,
  type SafeArea,
  type StartContext,
  type Theme,
} from './rules.ts';
export {
  SERVER_GAPS,
  scopeForField,
  type FieldScopes,
  type FieldsGap,
  type GapOutcome,
  type GapRequest,
  type ServerGap,
  type ServerGapName,
} from './server-gaps.ts';
export { TitleSchema } from './title.ts';
