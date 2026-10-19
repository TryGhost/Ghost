import React from 'react';
import { useLocation } from '@tryghost/admin-x-framework';

type PopHolder = () => boolean;

const holders = new Set<PopHolder>();
const replacements = new Set<(previousHref: string) => void>();
const heldUrls: string[] = [];
let isGateInstalled = false;

/**
 * Must be installed before the router or anything else listens for pops, and listens in the
 * capture phase, so it runs first whichever order an engine gives window listeners.
 */
export function installHistoryPopGate(): void {
  if (isGateInstalled) {
    return;
  }
  isGateInstalled = true;
  // Router replaces change the browser entry before their React transition commits.
  // Capture that entry synchronously so a Back in between cannot restore its old URL.
  const replaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args) => {
    const previousHref = window.location.href;
    replaceState(...args);
    for (const replaced of replacements) {
      replaced(previousHref);
    }
  };
  window.addEventListener(
    'popstate',
    (event) => {
      const url = window.location.href;
      for (const hold of holders) {
        if (hold()) {
          event.stopImmediatePropagation();
          heldUrls.push(url);
          return;
        }
      }
      heldUrls.length = 0;
    },
    { capture: true },
  );
  // A held pop still queues its hash change, which describes a URL that is no longer current.
  window.addEventListener(
    'hashchange',
    (event) => {
      const held = heldUrls.indexOf(event.newURL);
      if (held === -1 || event.newURL === window.location.href) {
        return;
      }
      heldUrls.splice(held, 1);
      event.stopImmediatePropagation();
    },
    { capture: true },
  );
}

/** The pathname the hash router reads from a `#/…` URL. */
export function hashPathname(hash: string): string {
  const [path] = hash.replace(/^#/, '').split(/[?#]/);
  return path.startsWith('/') ? path : `/${path}`;
}

function hasRouterIndex(state: unknown): state is { idx: number } {
  return (
    typeof state === 'object' &&
    state !== null &&
    Number.isInteger((state as { idx?: unknown }).idx)
  );
}

/** The screen's history state, re-indexed for the router to sit directly above a pop's target. */
export function restoredState(state: unknown, reachedState: unknown): unknown {
  return hasRouterIndex(state) && hasRouterIndex(reachedState)
    ? { ...state, idx: reachedState.idx + 1 }
    : state;
}

/** A pathname without its trailing slash, which the router ignores when matching routes. */
export function withoutTrailingSlash(pathname: string): string {
  return pathname.replace(/\/+$/, '');
}

interface GuardedEntry {
  pathname: string;
  href: string;
  state: unknown;
}

function currentEntry(): GuardedEntry {
  return {
    pathname: hashPathname(window.location.hash),
    href: window.location.href,
    state: window.history.state,
  };
}

/**
 * Holds history pops that leave the current pathname while `when` is true. The router
 * can only undo a POP between entries it created, so the pop is undone here instead.
 * While `isExitHeld`, a pop that keeps the pathname is kept from the router as well.
 */
export function useHistoryPopNavigationGuard(
  when: boolean,
  claim: () => boolean,
  isExitHeld: () => boolean,
) {
  const location = useLocation();
  const [isBlocked, setIsBlocked] = React.useState(false);
  const blockedRef = React.useRef(false);
  const releasedRef = React.useRef(false);
  const entryRef = React.useRef<GuardedEntry | null>(null);
  // Where the held pop went, and whether a later held pop has moved it from directly below.
  const reachedHrefRef = React.useRef('');
  const isDisplacedRef = React.useRef(false);
  const whenRef = React.useRef(when);
  whenRef.current = when;
  const claimRef = React.useRef(claim);
  claimRef.current = claim;
  const isExitHeldRef = React.useRef(isExitHeld);
  isExitHeldRef.current = isExitHeld;

  React.useLayoutEffect(() => {
    entryRef.current = {
      pathname: location.pathname,
      href: window.location.href,
      state: window.history.state,
    };
    releasedRef.current = false;
  }, [location]);

  React.useEffect(() => {
    const replaced = (previousHref: string) => {
      if (entryRef.current?.href !== previousHref) {
        return;
      }
      entryRef.current = currentEntry();
    };
    replacements.add(replaced);
    const hold: PopHolder = () => {
      const entry = entryRef.current;
      if (!whenRef.current || releasedRef.current || !entry) {
        return false;
      }
      const reachedPathname = withoutTrailingSlash(hashPathname(window.location.hash));
      if (reachedPathname === withoutTrailingSlash(entry.pathname)) {
        if (!isExitHeldRef.current()) {
          return false;
        }
        // Any navigation the router completes drops the exit it has blocked.
        entryRef.current = currentEntry();
        // A same-screen push leaves its entry above the one a held pop reached.
        if (blockedRef.current) {
          isDisplacedRef.current = true;
        }
        return true;
      }
      const reachedHref = window.location.href;
      // The entry the pop reached stays directly below, where `proceed` returns to.
      const state = restoredState(entry.state, window.history.state);
      window.history.pushState(state, '', entry.href);
      if (blockedRef.current) {
        isDisplacedRef.current ||= reachedHref !== reachedHrefRef.current;
      } else if (claimRef.current()) {
        blockedRef.current = true;
        reachedHrefRef.current = reachedHref;
        isDisplacedRef.current = false;
        setIsBlocked(true);
      }
      return true;
    };
    holders.add(hold);
    return () => {
      holders.delete(hold);
      replacements.delete(replaced);
    };
  }, []);

  return {
    isBlocked,
    /** Stops holding pops until the location changes, so an accepted exit is not held. */
    release: () => {
      releasedRef.current = true;
    },
    /**
     * Confirm leaving: returns to the entry the held pop reached, or puts that URL in place
     * of the screen's entry once a later held pop has moved it from directly below.
     */
    proceed: () => {
      if (!blockedRef.current) {
        return;
      }
      blockedRef.current = false;
      releasedRef.current = true;
      setIsBlocked(false);
      if (isDisplacedRef.current) {
        window.location.replace(reachedHrefRef.current);
      } else {
        window.history.back();
      }
    },
    /** Cancel leaving: the screen's URL is already back in place. */
    reset: () => {
      blockedRef.current = false;
      setIsBlocked(false);
    },
  };
}
