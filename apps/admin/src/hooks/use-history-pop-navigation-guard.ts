import React from 'react';
import { useLocation } from '@tryghost/admin-x-framework';

type PopHolder = () => boolean;

const holders = new Set<PopHolder>();
const heldUrls: string[] = [];
let isGateInstalled = false;

/**
 * Must run before anything else listens for pops, the router included: window listeners
 * fire in the order they were added, and a held pop has to be hidden from all of them.
 */
export function installHistoryPopGate(): void {
  if (isGateInstalled) {
    return;
  }
  isGateInstalled = true;
  window.addEventListener('popstate', (event) => {
    const url = window.location.href;
    for (const hold of holders) {
      if (hold()) {
        event.stopImmediatePropagation();
        heldUrls.push(url);
        return;
      }
    }
  });
  // A held pop still queues its hash change, which describes a URL that is no longer current.
  window.addEventListener('hashchange', (event) => {
    const held = heldUrls.indexOf(event.newURL);
    if (held === -1 || event.newURL === window.location.href) {
      return;
    }
    heldUrls.splice(held, 1);
    event.stopImmediatePropagation();
  });
}

/** The pathname the hash router reads from a `#/…` URL. */
export function hashPathname(hash: string): string {
  const [path] = hash.replace(/^#/, '').split(/[?#]/);
  return path.startsWith('/') ? path : `/${path}`;
}

interface GuardedEntry {
  pathname: string;
  href: string;
  state: unknown;
}

/**
 * Holds history pops that leave the current pathname while `when` is true. The router
 * can only undo a POP between entries it created, so the pop is undone here instead.
 */
export function useHistoryPopNavigationGuard(when: boolean, claim: () => boolean) {
  const location = useLocation();
  const [isBlocked, setIsBlocked] = React.useState(false);
  const blockedRef = React.useRef(false);
  const releasedRef = React.useRef(false);
  const entryRef = React.useRef<GuardedEntry | null>(null);
  const whenRef = React.useRef(when);
  whenRef.current = when;
  const claimRef = React.useRef(claim);
  claimRef.current = claim;

  React.useLayoutEffect(() => {
    entryRef.current = {
      pathname: location.pathname,
      href: window.location.href,
      state: window.history.state,
    };
    releasedRef.current = false;
  }, [location]);

  React.useEffect(() => {
    const hold: PopHolder = () => {
      const entry = entryRef.current;
      if (!whenRef.current || releasedRef.current || !entry) {
        return false;
      }
      if (hashPathname(window.location.hash) === entry.pathname) {
        return false;
      }
      // The entry the pop reached stays directly below, where `proceed` returns to.
      window.history.pushState(entry.state, '', entry.href);
      if (!blockedRef.current && claimRef.current()) {
        blockedRef.current = true;
        setIsBlocked(true);
      }
      return true;
    };
    holders.add(hold);
    return () => {
      holders.delete(hold);
    };
  }, []);

  return {
    isBlocked,
    /** Stops holding pops until the location changes, so an accepted exit is not held. */
    release: () => {
      releasedRef.current = true;
    },
    /** Confirm leaving: returns to the entry the held pop reached. */
    proceed: () => {
      if (!blockedRef.current) {
        return;
      }
      blockedRef.current = false;
      releasedRef.current = true;
      setIsBlocked(false);
      window.history.back();
    },
    /** Cancel leaving: the screen's URL is already back in place. */
    reset: () => {
      blockedRef.current = false;
      setIsBlocked(false);
    },
  };
}
