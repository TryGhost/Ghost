import type { FetchRequest } from './fetch.ts';
import type { FetchResponse, PathMove, Place, StartContext, Theme } from './rules.ts';

/**
 * The calls each side of the channel exposes to the other. Every call returns a promise,
 * because every call crosses a `MessagePort`. No call takes a function, so the channel never
 * has to proxy one back to the caller.
 *
 * The channel is unversioned. It grows by these rules:
 *
 * - Admin only ever adds exports and optional fields; it never renames or removes one.
 * - Admin's connect message lists what it supports: the names of its exports, and a name for
 *   each newer argument field or place it accepts. Every new argument field, and every new
 *   place an SDK may send, gets such a name. The SDK refuses to send one as `unsupported`
 *   unless Admin lists it, so a newer SDK never depends on an older Admin ignoring something.
 *   Admin's schemas stay strict and refuse anything they don't know.
 * - In the other direction, a field Admin sends never changes how an existing field is read.
 *   A new meaning gets a new field, which an older SDK ignores.
 */

/** What Admin exposes to an app's page. Admin validates every argument; the frame is untrusted. */
export interface HostExports {
  /**
   * Calls the Admin API on the app's behalf. A request the allowlist doesn't allow, or whose
   * path escapes the Admin API root, never reaches the network.
   */
  fetch(request: FetchRequest): Promise<FetchResponse>;
  /** Reports a new page title. Admin shows it as its own title while the page is open. */
  titleChanged(title: string): Promise<void>;
  /**
   * Reports that the app moved to another of its own routes. Admin owns the history: it pushes
   * an entry for a `push` and replaces its current one for a `replace`, while the frame keeps
   * a single entry. The SDK decides which from the call the app made (`history.pushState`, a
   * link, or `history.replaceState`); the app never chooses. Resolves with the app's path as
   * Admin now has it: `path` normalised, or Admin's current path when Admin didn't follow.
   */
  pathChanged(path: string, move: PathMove): Promise<string>;
  /** Sends the publisher to a named place in Admin. */
  open(place: Place): Promise<void>;
}

/** What an app's page exposes to Admin, through the SDK. */
export interface AppExports {
  /** Starts the session. The page is shown once this resolves. */
  start(context: StartContext): Promise<void>;
  themeChanged(theme: Theme): Promise<void>;
  /**
   * Admin moved the app to another of its routes: back or forward in Admin's history, or one
   * of Admin's own links. The page follows without adding a history entry.
   */
  pathChanged(path: string): Promise<void>;
}
