/**
 * The bridge is the only way an app talks to Ghost, so it stays narrow: a
 * small set of named operations, each checked here before Admin acts on it.
 *
 * Messages from an app:   { source: 'ghost-app', id, op, payload }
 * Replies from Admin:     { source: 'ghost-admin', id, ok, result | error }
 * Events from Admin:      { source: 'ghost-admin', event, data }
 */
export const APP_MESSAGE_SOURCE = 'ghost-app';
export const ADMIN_MESSAGE_SOURCE = 'ghost-admin';

export type BridgeOperation =
  | 'ready'
  | 'getContext'
  | 'setTitle'
  | 'setRoute'
  | 'navigate'
  | 'api.get';

export const BRIDGE_OPERATIONS: BridgeOperation[] = [
  'ready',
  'getContext',
  'setTitle',
  'setRoute',
  'navigate',
  'api.get',
];

/** Admin API resources an app may read in this slice. */
export const READABLE_RESOURCES = ['posts', 'pages', 'tags', 'site'];

export interface AppMessage {
  source: typeof APP_MESSAGE_SOURCE;
  id: string;
  op: BridgeOperation;
  payload?: unknown;
}

export interface BridgeContext {
  site: { title: string; url: string };
  user: { name: string; email: string };
  theme: 'light' | 'dark';
  /** The app's own page, relative to its root, e.g. `/` or `/week`. */
  route: string;
}

export function isAppMessage(data: unknown): data is AppMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const message = data as Record<string, unknown>;
  return (
    message.source === APP_MESSAGE_SOURCE &&
    typeof message.id === 'string' &&
    typeof message.op === 'string'
  );
}

export function isKnownOperation(op: string): op is BridgeOperation {
  return (BRIDGE_OPERATIONS as string[]).includes(op);
}

/**
 * Resolves an app's API path against the Admin API root and checks it *after*
 * the URL has been normalised, so `..` segments (plain or encoded) can't climb
 * out of the API or reach a resource that isn't allowed.
 */
export function resolveApiPath(path: unknown, apiRoot: string, origin: string): string | null {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return null;
  }
  if (path.includes('\\')) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(`${apiRoot.replace(/\/$/, '')}${path}`, origin);
  } catch {
    return null;
  }

  const root = `${apiRoot.replace(/\/$/, '')}/`;
  if (url.origin !== origin || !url.pathname.startsWith(root)) {
    return null;
  }

  const resource = url.pathname.slice(root.length).split('/')[0];
  if (!READABLE_RESOURCES.includes(resource)) {
    return null;
  }

  return `${url.pathname}${url.search}`;
}

/** An app's own route (from its nav or `setRoute`), normalised the same way. */
export const resolveAppRoute = resolveNavigation;

/**
 * Apps can move the publisher to another place in Admin, never to an
 * arbitrary URL. Returns the normalised Admin path, or null when refused.
 */
export function resolveNavigation(to: unknown): string | null {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//') || to.includes('\\')) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(to, 'https://admin.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'https://admin.invalid') {
    return null;
  }

  return `${url.pathname}${url.search}`;
}
