import type { OverlayTint, Place, StartContext, Theme } from '@tryghost/app-contracts';

import type { GhostAppError } from './errors.ts';

export type { OverlayTint, Place, StartContext, Theme };

// The context is read-only: the SDK hands out frozen copies, so no part of a page can change
// what every other part reads.

/** The site the app is running in. */
export type Site = Readonly<StartContext['site']>;

/**
 * Who is using the app, by ID and role. Read anything more, such as their name, through
 * `` ghost.fetch(`/users/?filter=id:${ghost.user.id}`) ``: `/users/:id/` isn't allowed.
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
  /**
   * Anything `Headers` accepts, except the headers only Admin sets, such as `authorization`,
   * `cookie` and `content-type`, which are refused.
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
   * the URL parser's normalised form, as Admin stores it (`/search?q=a%20b`, `..` resolved).
   */
  readonly current: string;
}

export type Unsubscribe = () => void;

/** A dialog or sheet's hold on the overlay, from when it mounts until it unmounts. */
export interface OverlayHold {
  /**
   * Whether the dialog is open: true from when it opens, false once it starts to close. Admin
   * shows the overlay while any dialog holding it is open.
   */
  setOpen(open: boolean): void;
  /** Called once the dialog has unmounted, after its closing animation. */
  release(): void;
}

/**
 * Where the app's dialogs and sheets render so they cover all of Admin, not just the app's
 * page: a second document on the app's origin that Admin shows above its own chrome, over a
 * tint.
 */
export interface GhostOverlay {
  /**
   * The element to render a dialog or sheet into, or undefined to render it in the page as
   * before: when Admin has no overlay, while it's still loading, or when the dialog opens
   * without the publisher having just clicked or typed in the app.
   */
  container(): HTMLElement | undefined;
  /**
   * Called by a dialog or sheet rendered into `container()` when it mounts, with its content
   * element: the one that has `role="dialog"`, and holds its focus.
   *
   * `refused` is called if Admin won't show the overlay as the dialog opens, such as when the
   * publisher's click has run out by the time Admin hears of it. The dialog then renders in the
   * page instead, where it's seen, until it next opens, and releases this hold as it leaves the
   * overlay. It has only just opened, so it loses nothing by mounting again.
   */
  hold(tint: OverlayTint, element: HTMLElement, refused: () => void): OverlayHold;
}

/** The connection to Ghost, once Admin has started the app. */
export interface Ghost {
  /** The site the app is running in: its URL, title, timezone and locale. */
  readonly site: Site;
  /** The staff user using the app, by ID and role. */
  readonly user: User;
  /** The theme Admin shows now. `mode` is always `light` or `dark`. */
  readonly theme: Readonly<Theme>;
  /** The installation's revision when this session started. */
  readonly session: Session;
  /** The app's route, kept in step with Admin's URL. */
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
  /** Where dialogs and sheets render to cover all of Admin. */
  readonly overlay: GhostOverlay;
}
