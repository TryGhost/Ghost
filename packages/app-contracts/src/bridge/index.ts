/**
 * The bridge: the channel between Admin and an app's page, framed inside Admin.
 *
 * Admin and the SDK talk over a `MessagePort` that Admin hands the frame once it has said
 * hello from the right origin. This entry point holds what both sides agree on: the two
 * window messages that set the channel up, the calls each side exposes, the validation Admin
 * applies to every argument from the untrusted frame, and what the fetch escape hatch may
 * reach (`checkAdminApiPath` and the blocklist).
 *
 * The zod-free rules in `rules.ts` are also exported from the root entry point, for the SDK.
 */

export { ADMIN_API_BLOCKLIST, type BlockedAdminApiCategory } from './blocklist.ts';
export type { AppExports, HostExports } from './exports.ts';
export {
  FETCH_BODY_MAX_BYTES,
  FETCH_PATH_MAX_LENGTH,
  FetchRequestSchema,
  type FetchRequest,
} from './fetch.ts';
export { HelloMessageSchema, type HelloMessage } from './messages.ts';
export {
  APP_PATH_MAX_LENGTH,
  AppPathSchema,
  PathChangeOptionsSchema,
  type AppPath,
  type PathChangeOptions,
} from './paths.ts';
export { PlaceSchema, type Place } from './places.ts';
export { checkAdminApiPath, type AdminApiPathCheck } from './resolve.ts';
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
  isMultipartContentType,
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
  type StartContext,
  type Theme,
} from './rules.ts';
export { TitleSchema } from './title.ts';
