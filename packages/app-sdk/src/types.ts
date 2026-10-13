import type { PathChangeOptions, Place, StartContext, Theme } from '@tryghost/app-contracts';

import type { GhostAppError } from './errors.ts';

export type { PathChangeOptions, Place, StartContext, Theme };

/** The site the app is running in. */
export type Site = StartContext['site'];

/** Who is using the app, by ID and role. Ask the Admin API for anything more. */
export type User = StartContext['user'];

export interface Session {
  /** The installation revision this session was started against. */
  readonly revision: number;
}

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
  /** Text is sent as it is; an object or array is sent as JSON. */
  body?: string | JsonBody | null;
}

/** The app's own route, mirrored in Admin's address. */
export interface GhostPath {
  /** The app's route, such as `/episodes/12`. `/` when Admin's address names none. */
  readonly current: string;
  /**
   * Tells Admin the app moved to another of its own routes, so the address bar, a reload
   * and the back button follow it. Use `replace` for a redirect. The app does its own
   * routing; this does not navigate the page.
   */
  set(path: string, options?: PathChangeOptions): Promise<void>;
}

export type Unsubscribe = () => void;

/** The connection to Ghost, once Admin has started the app. */
export interface Ghost {
  readonly site: Site;
  readonly user: User;
  /** The theme Admin shows now. `mode` is always `light` or `dark`. */
  readonly theme: Theme;
  readonly session: Session;
  readonly path: GhostPath;
  /** False once the session has ended; every call then rejects with `session_ended`. */
  readonly connected: boolean;
  /** Called when the publisher switches Admin's theme. */
  onThemeChange(callback: (theme: Theme) => void): Unsubscribe;
  /**
   * Called when Admin's address moves within the app, by back, forward or a link. Not
   * called for the app's own `path.set`.
   */
  onPathChange(callback: (path: string) => void): Unsubscribe;
  /** Called once when the session ends. Called straight away if it already has. */
  onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe;
  /**
   * Calls the Admin API as the signed-in staff user. `path` is relative to the Admin API
   * root, such as `/posts/?limit=5`, never a URL. Answers with a real `Response`, whatever
   * its status; it rejects only when Admin refuses to make the request.
   */
  fetch(path: string, init?: GhostFetchInit): Promise<Response>;
  /** Sends the publisher to a place in Admin, such as `{ post: { id } }`. */
  open(place: Place): Promise<void>;
}
