import type {
  AppPermissionKey,
  OverlayTint,
  Place,
  StartContext,
  Theme,
} from '@tryghost/app-contracts';

import type { GhostAppError } from './errors.ts';

export type { AppPermissionKey, OverlayTint, Place, StartContext, Theme };

// The context is read-only: the SDK hands out frozen copies, so no part of a page can change
// what every other part reads.

/** The site the app is running in. */
export type Site = Readonly<StartContext['site']>;

/**
 * Who is using the app, by ID and role. Read anything more, such as their name, through
 * `` ghost.fetch(`/users/?filter=id:${ghost.user.id}`) ``: no scope opens `/users/:id/`.
 */
export type User = Readonly<StartContext['user']>;

/** The session with Admin: the installation's revision when the session started. */
export type Session = Readonly<StartContext['session']>;

/**
 * The permission keys the app was approved for on this site, as its manifest's `scopes` lists
 * them, such as `post:browse`. A key this SDK doesn't know is still listed, so an app granted
 * a key added in a later Ghost sees it.
 */
export type Scopes = Readonly<StartContext['scopes']>;

export interface ConnectOptions {
  /** How long to wait for Admin to start the app, in milliseconds. Defaults to 10 seconds. */
  timeout?: number;
}

/** A body sent as JSON: a plain object or an array. */
export type JsonBody = Record<string, unknown> | readonly unknown[];

/** Like `RequestInit`, for the requests Admin can make on the app's behalf. */
export interface GhostFetchInit {
  /** Any case, sent in uppercase. Defaults to `GET`. */
  method?: string;
  /**
   * Anything `Headers` accepts, except the headers only Admin sets. The SDK refuses those,
   * such as `authorization`, `cookie` and `content-type`.
   */
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
   * the URL parser's normalized form, as Admin stores it (`/search?q=a%20b`, `..` resolved).
   */
  readonly current: string;
}

export type Unsubscribe = () => void;

/** A dialog or sheet's hold on the overlay, from when it mounts until it unmounts. */
export interface OverlayHold {
  /** True from when the dialog opens, false once it starts to close. */
  setOpen(open: boolean): void;
  /** Called once the dialog has unmounted, after its closing animation. */
  release(): void;
}

/**
 * Where the app's dialogs and sheets render to cover all of Admin: the app's page, loaded a
 * second time over the whole window. In it, `--ghost-safe-area-inset-*` are measured from the
 * window's edges.
 *
 * That copy never connects, but code that runs before `connect()` resolves runs there too, so
 * start fetches, analytics and the like once `connect()` has resolved.
 */
export interface GhostOverlay {
  /**
   * The element to render a dialog or sheet into, or undefined to render it in the page while
   * the overlay is still loading.
   */
  container(): HTMLElement | undefined;
  /**
   * Called by a dialog or sheet rendered into `container()` when it mounts, with its
   * `role="dialog"` element.
   */
  hold(tint: OverlayTint, element: HTMLElement): OverlayHold;
}

/**
 * The connection to Ghost, once Admin has started the app.
 *
 * Admin's chrome floats over the edges of the page. The SDK sets how far in to keep content, in
 * pixels, as `--ghost-safe-area-inset-top`, `-right`, `-bottom` and `-left` on the page's root
 * element, and keeps them up to date. Shade's `ShadeApp` pads the app by them already.
 */
export interface Ghost {
  /** The site the app is running in: its URL, title, timezone and locale. */
  readonly site: Site;
  /** The staff user using the app, by ID and role. */
  readonly user: User;
  /** The theme Admin shows now. `mode` is always `light` or `dark`. */
  readonly theme: Readonly<Theme>;
  /** The installation's revision when this session started. */
  readonly session: Session;
  /**
   * The permission keys the app was approved for on this site. Ghost answers a call none of
   * them covers with a `403`, so check here before offering something the app can't do. They don't change while the session lasts.
   */
  readonly scopes: Scopes;
  /** The app's route, kept in step with Admin's URL. */
  readonly path: GhostPath;
  /** False once the session has ended. Every call then rejects with `session_ended`. */
  readonly connected: boolean;
  /** Registers a callback that runs when the person using the app switches Admin's theme. */
  onThemeChange(callback: (theme: Readonly<Theme>) => void): Unsubscribe;
  /**
   * Registers a callback that runs when Admin moves the app to another of its routes: Back or
   * forward in Admin's history, or one of Admin's own links. The SDK has already put the
   * page's URL there and dispatched `popstate`, which a router follows. A multi-page app, with
   * no router to render the new address, loads it: `location.replace(path)`. It doesn't run for
   * the app's own moves.
   */
  onPathChange(callback: (path: string) => void): Unsubscribe;
  /**
   * Registers a callback that runs once when this document leaves the app session, because the
   * page reloads, posts a form or follows a link, or when the app session itself ends. It runs
   * straight away if that has already happened.
   */
  onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe;
  /**
   * Calls the Admin API as the signed-in staff user. `path` is relative to the Admin API
   * root, such as `/posts/?limit=5`, never a URL. Resolves with a real `Response` whatever
   * its status, and rejects only when Admin refuses to make the request.
   */
  fetch(path: string, init?: GhostFetchInit): Promise<Response>;
  /** Sends the person using the app to a place in Admin, such as `{ post: { id } }`. */
  open(place: Place): Promise<void>;
  /** Where dialogs and sheets render to cover all of Admin. Pass it to `ShadeApp`. */
  readonly overlay: GhostOverlay;
}
