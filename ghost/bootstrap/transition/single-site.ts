/**
 * Ghost runs one site per process, so there is one site scope and it is held here.
 * Leaves when each request or job opens the scope of the site it is for.
 */
import type { Scope } from '#foundation/application';
import { application } from '../app';

let scope: Scope | undefined;

/** Boots the application and opens the site scope. Called by each boot in this process. */
export function start(): Scope {
  application.boot();
  scope ??= application.createSiteScope();
  return scope;
}

/** Ends the site scope: its listeners are removed and its services dropped. */
export function stop(): void {
  scope?.dispose();
  scope = undefined;
}

export function site(): Scope {
  if (scope === undefined) {
    throw new Error('The site scope was used before boot opened it.');
  }
  return scope;
}
