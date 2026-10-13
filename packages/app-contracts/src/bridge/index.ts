/**
 * The bridge: the channel between Admin and an app's page, framed inside Admin.
 *
 * Admin and the SDK talk over a `MessagePort` that Admin hands the frame once it has said
 * hello from the right origin. This entry point holds what both sides agree on: the two
 * window messages that set the channel up, the calls each side exposes, and the validation
 * Admin applies to every argument a frame sends, which it does not trust.
 *
 * It also holds the rules Admin applies to the fetch escape hatch, `resolveAdminApiPath` and
 * `isBlockedAdminApiPath`, so what an app may reach is written down in one place.
 *
 * The rules that depend on nothing, the message types, limits and shape guards in `rules.ts`,
 * are exported from the root entry point too, for the SDK to use without zod.
 */

export {
  ADMIN_API_BLOCKLIST,
  isBlockedAdminApiPath,
  type BlockedAdminApiCategory,
} from './blocklist.ts';
export { StartContextSchema, ThemeSchema, type StartContext, type Theme } from './context.ts';
export type { AppExports, HostExports } from './exports.ts';
export {
  FETCH_BODY_MAX_BYTES,
  FETCH_PATH_MAX_LENGTH,
  FetchRequestSchema,
  FetchResponseSchema,
  type FetchRequest,
  type FetchResponse,
} from './fetch.ts';
export {
  ConnectMessageSchema,
  HelloMessageSchema,
  type ConnectMessage,
  type HelloMessage,
} from './messages.ts';
export {
  APP_PATH_MAX_LENGTH,
  AppPathSchema,
  PathChangeOptionsSchema,
  type AppPath,
  type PathChangeOptions,
} from './paths.ts';
export { PlaceSchema, type Place } from './places.ts';
export { resolveAdminApiPath } from './resolve.ts';
export {
  CONNECT_MESSAGE_TYPE,
  FETCH_METHODS,
  FETCH_RESPONSE_STATUS_MAX,
  FETCH_RESPONSE_STATUS_MIN,
  HELLO_MESSAGE_TYPE,
  TITLE_MAX_LENGTH,
  isConnectMessage,
  isContainedPath,
  isFetchResponse,
  isRecord,
  isStartContext,
  isTheme,
  type FetchMethod,
} from './rules.ts';
export { TitleSchema } from './title.ts';
