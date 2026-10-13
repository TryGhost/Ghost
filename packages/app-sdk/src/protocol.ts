import type {
  ConnectMessage,
  FetchMethod,
  HelloMessage,
  StartContext,
  Theme,
} from '@tryghost/app-contracts/bridge';

/**
 * The few values the SDK shares with the contract. They are copied rather than imported, so
 * the SDK carries nothing of app-contracts (or zod) at runtime; each is typed against the
 * contract, and a test checks the values match, so the two cannot drift apart.
 */

export const HELLO_MESSAGE_TYPE: HelloMessage['type'] = 'ghost-app:hello';
export const CONNECT_MESSAGE_TYPE: ConnectMessage['type'] = 'ghost-app:connect';
export const TITLE_MAX_LENGTH = 200;
export const FETCH_METHODS: readonly FetchMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
];

// Admin is trusted, so what it sends is only checked for shape: enough that a mistake shows
// up as a clear error here rather than as `undefined` somewhere in the app.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStrings(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

export function isPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/');
}

export function isTheme(value: unknown): value is Theme {
  return (
    hasStrings(value, ['mode', 'accent_color']) &&
    ((value as Theme).mode === 'light' || (value as Theme).mode === 'dark')
  );
}

export function isStartContext(value: unknown): value is StartContext {
  return (
    isRecord(value) &&
    hasStrings(value.site, ['url', 'title', 'timezone', 'locale']) &&
    hasStrings(value.user, ['id', 'role']) &&
    isTheme(value.theme) &&
    isRecord(value.session) &&
    typeof value.session.revision === 'number' &&
    isPath(value.path)
  );
}

export function isConnectMessage(value: unknown): value is ConnectMessage {
  return isRecord(value) && value.type === CONNECT_MESSAGE_TYPE;
}
