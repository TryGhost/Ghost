import type { Place, StartContext, Theme } from '@tryghost/app-contracts';

import type { GhostAppError } from './errors.ts';

export type { Place, StartContext, Theme };

// The context is read-only: the SDK hands out frozen copies, so no part of a page can change
// what every other part reads.

/** The site the app is running in. */
export type Site = Readonly<StartContext['site']>;

/**
 * Who is using the app, by ID and role. Read anything more, such as their name, through
 * `ghost.fetch(`/users/?filter=id:${ghost.user.id}`)`: `/users/:id/` isn't allowed.
 */
export type User = Readonly<StartContext['user']>;

/** The session with Admin: the installation's revision when the session started. */
export type Session = Readonly<StartContext['session']>;

export interface ConnectOptions {
  /** How long to wait for Admin to start the app, in milliseconds. Defaults to 10 seconds. */
  timeout?: number;
}

/** A body sent as JSON: a plain object or an array. */
export type JsonBody = Record<string, unknown> | readonly unknown[];

/** Like `RequestInit`, for the requests Admin can make on the app's behalf. */
export interface GhostFetchInit {
  /** Any case; sent in uppercase. Defaults to `GET`. */
  method?: string;
  headers?: HeadersInit;
  /** Always JSON: text is sent as it is, and an object or array is sent as JSON. */
  body?: string | JsonBody | null;
}

/**
 * The app's route, mirrored in Admin's URL. The SDK keeps it in step with the page's own
 * history: the app routes with `history.pushState` and links as it would anywhere, and the SDK
 * reports each move to Admin, which keeps the history.
 */
export interface GhostPath {
  /**
   * The app's route: the path, query and fragment of the page's URL, such as `/episodes/12`, in
   * the URL parser's normalised form, as Admin stores it (`/search?q=a%20b`, `..` resolved).
   */
  readonly current: string;
}

export type Unsubscribe = () => void;

/** The connection to Ghost, once Admin has started the app. */
export interface Ghost {
  readonly site: Site;
  readonly user: User;
  /** The theme Admin shows now. `mode` is always `light` or `dark`. */
  readonly theme: Readonly<Theme>;
  readonly session: Session;
  readonly path: GhostPath;
  /** False once the session has ended; every call then rejects with `session_ended`. */
  readonly connected: boolean;
  /** Called when the publisher switches Admin's theme. */
  onThemeChange(callback: (theme: Readonly<Theme>) => void): Unsubscribe;
  /**
   * Called when Admin moves the app to another of its routes: back or forward in Admin's
   * history, or one of Admin's own links. The SDK has already put the page's URL there and
   * dispatched `popstate`, which a router follows. A multi-page app, with no router to render
   * the new address, loads it: `location.replace(path)`. Not called for the app's own moves.
   */
  onPathChange(callback: (path: string) => void): Unsubscribe;
  /**
   * Called once when this document leaves the app session, because the page reloads, posts a
   * form or follows a link, or when the app session itself ends. Called straight away if that
   * has already happened.
   */
  onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe;
  /**
   * Calls the Admin API as the signed-in staff user. `path` is relative to the Admin API
   * root, such as `/posts/?limit=5`, never a URL. Resolves with a real `Response` whatever
   * its status, and rejects only when Admin refuses to make the request.
   */
  fetch(path: string, init?: GhostFetchInit): Promise<Response>;
  /** Sends the publisher to a place in Admin, such as `{ post: { id } }`. */
  open(place: Place): Promise<void>;
}
