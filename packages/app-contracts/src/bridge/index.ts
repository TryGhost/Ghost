/**
 * The bridge: the channel between Admin and an app's page, which Admin shows in a frame.
 *
 * Admin and the SDK talk over a `MessagePort`. Admin hands the port to the frame once the SDK
 * in it has sent a hello from the right origin. This entry point holds what both sides agree
 * on: the two window messages that set up the channel, the calls each side exposes, the
 * validation Admin applies to every argument from the untrusted frame, and what the fetch
 * escape hatch may reach (`checkAdminApiRequest` and the allowlist).
 *
 * The root entry point also exports the zod-free rules in `rules.ts`, for the SDK.
 */

export { ADMIN_API_ALLOWLIST, type AdminApiScope } from './allowlist.ts';
export type { AppExports, HostExports } from './exports.ts';
export {
  FETCH_BODY_MAX_BYTES,
  FETCH_PATH_MAX_LENGTH,
  FetchRequestSchema,
  type FetchRequest,
} from './fetch.ts';
export { HelloMessageSchema, type HelloMessage } from './messages.ts';
export { APP_PATH_MAX_LENGTH, AppPathSchema, type AppPath } from './paths.ts';
export { PlaceSchema } from './places.ts';
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
  START_TIMEOUT_MS,
  TITLE_MAX_LENGTH,
  decodeBridgeError,
  encodeBridgeError,
  isConnectMessage,
  isContainedPath,
  isFetchResponse,
  isRecord,
  isReservedRequestHeader,
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
  type Place,
  type StartContext,
  type Theme,
} from './rules.ts';
export { TitleSchema } from './title.ts';
