import type { StartContext, Theme } from './context.ts';
import type { FetchRequest, FetchResponse } from './fetch.ts';
import type { PathChangeOptions } from './paths.ts';
import type { Place } from './places.ts';

/**
 * What each side of the channel exposes to the other. Every call returns a promise, as every
 * call crosses a `MessagePort`, and no call takes a function, so nothing is ever proxied back.
 *
 * The channel is unversioned: Admin only adds exports and optional fields, and the SDK turns a
 * missing export into one clear error.
 */

/** What Admin exposes to an app's page. Admin validates every argument; the frame is untrusted. */
export interface HostExports {
  /** Calls the Admin API on the app's behalf. Blocked and escaping paths never reach the network. */
  fetch(request: FetchRequest): Promise<FetchResponse>;
  /** The page's title changed; Admin shows it as its own while the page is open. */
  titleChanged(title: string): Promise<void>;
  /** The app moved to another of its own routes; Admin mirrors it without reloading the frame. */
  pathChanged(path: string, options?: PathChangeOptions): Promise<void>;
  /** Sends the publisher to a named place in Admin. */
  open(place: Place): Promise<void>;
}

/** What an app's page exposes to Admin, through the SDK. */
export interface AppExports {
  /** Starts the session. The page is shown once this resolves. */
  start(context: StartContext): Promise<void>;
  themeChanged(theme: Theme): Promise<void>;
  /** Admin's address moved within the app, by back, forward or a link. */
  pathChanged(path: string): Promise<void>;
}
