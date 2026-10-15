import type { FetchRequest } from './fetch.ts';
import type { FetchResponse, Place, StartContext, Theme } from './rules.ts';

/**
 * The calls each side of the channel exposes to the other. Every call returns a promise,
 * because every call crosses a `MessagePort`. No call takes a function, so the channel never
 * has to proxy one back to the caller.
 *
 * The channel is unversioned: Admin only ever adds exports and optional fields. Admin's connect
 * message lists the names it exports, so the SDK rejects a call this Admin doesn't have as
 * `unsupported`.
 */

/** What Admin exposes to an app's page. Admin validates every argument; the frame is untrusted. */
export interface HostExports {
  /**
   * Calls the Admin API on the app's behalf. Paths that are blocked, or that escape the Admin
   * API root, never reach the network.
   */
  fetch(request: FetchRequest): Promise<FetchResponse>;
  /** Reports a new page title. Admin shows it as its own title while the page is open. */
  titleChanged(title: string): Promise<void>;
  /**
   * Reports that the app moved to another of its own routes, including back and forward
   * within the frame. Admin mirrors it by replacing its own URL, so the frame's history entry is
   * the only one the move adds. Resolves with the app's path as Admin now has it: `path`
   * normalised, or Admin's current path when Admin didn't follow the move.
   */
  pathChanged(path: string): Promise<string>;
  /** Sends the publisher to a named place in Admin. */
  open(place: Place): Promise<void>;
}

/** What an app's page exposes to Admin, through the SDK. */
export interface AppExports {
  /** Starts the session. The page is shown once this resolves. */
  start(context: StartContext): Promise<void>;
  themeChanged(theme: Theme): Promise<void>;
  /**
   * Admin moved the app to another of its routes, through a link in Admin or Admin's own
   * history. The page follows without adding a history entry.
   */
  pathChanged(path: string): Promise<void>;
}
