import { isContainedPath, type PathMove } from '@tryghost/app-contracts';

/**
 * A URL's route: its path, query and fragment. The URL parser has already put them in the
 * normalised form Admin stores app paths in. Resolving them again would read a path that starts
 * with `//` as a host, so a page at `//evil.example/x` would report `/x`; kept as it is, that
 * route fails `isContainedPath` and is never reported.
 */
function routeOf({ pathname, search, hash }: { pathname: string; search: string; hash: string }) {
  return `${pathname}${search}${hash}`;
}

/** The page's route. */
export function currentRoute(): string {
  return routeOf(window.location);
}

const WEB_PROTOCOLS = new Set(['http:', 'https:']);

const LINK_NAMESPACES = new Set(['http://www.w3.org/1999/xhtml', 'http://www.w3.org/2000/svg']);

/**
 * Whether a node is an HTML or SVG link, which the browser follows when it's clicked. Read from
 * its name, not its class, so a link in the app's overlay, another document, counts too.
 */
function isLink(node: EventTarget): node is Element {
  const element = node as Partial<Element>;
  return (
    element.localName === 'a' &&
    LINK_NAMESPACES.has(element.namespaceURI ?? '') &&
    element.hasAttribute?.('href') === true
  );
}

export interface HistoryWatch {
  /**
   * Puts the page at `path` without adding a history entry, because Admin moved it there, and
   * dispatches `popstate` so the app's router shows it.
   */
  follow(path: string): void;
  /**
   * Treats links in `overlay`, the app's overlay document that the page renders its dialogs
   * into, as the page's own, in place of the overlay's previous document. The overlay stays on
   * the app's page: the page follows each link to a web page instead.
   * Nothing once stopped.
   */
  watchLinks(overlay: Document): void;
  /** Gives the page its own history methods and links back. */
  stop(): void;
}

/**
 * Whether a route is one Admin would take. Admin owns the app's address, so the page never
 * moves to a route Admin refuses: it would show a place that a reload, Back or a copied Admin
 * link doesn't lead to. `isContainedPath` refuses the same route every time, so the move is
 * dropped, with a warning for the app's developer.
 */
function isContained(route: string): boolean {
  if (isContainedPath(route)) {
    return true;
  }
  // The only place the app's developer would learn why the move did nothing.
  // eslint-disable-next-line no-console
  console.warn(`Ghost Admin can't open the app at ${route}, so the page stays where it is.`);
  return false;
}

/**
 * Whether a `pushState` or `replaceState` URL leads to a route Admin refuses. One the URL
 * parser can't read is left to the browser, which throws as it would without the SDK.
 */
function refuses(url: string | URL | null | undefined): boolean {
  if (url === undefined || url === null) {
    return false;
  }
  const next = URL.parse(url, window.location.href);
  return next !== null && next.origin === window.location.origin && !isContained(routeOf(next));
}

/**
 * Makes Admin the owner of the page's history. A frame's history entries are part of the tab's,
 * and browsers keep them in ways Admin can't follow: Chromium and WebKit keep a removed frame's
 * entries, which left back steps that did nothing once the app's page opened again, and WebKit
 * applies Admin's replace after a frame's push to the entry before it. So the frame keeps a
 * single entry, and Admin keeps one for each of the app's moves.
 *
 * - `history.pushState` and `history.replaceState` replace the frame's entry, then report the
 *   move to Admin as a push or a replace, which is how Admin records it. A move to the route the
 *   page is already on isn't reported, so Admin never gets an entry that changes nothing.
 * - A click on a link to the app's own origin, which a router hasn't already handled, is reported
 *   as a push, and the page then loads the link's address in place of its own entry. A link that
 *   opens elsewhere (a `target`, `download`, or a modifier key) is left alone.
 * - Neither is made to a route Admin would refuse, one that isn't contained.
 * - When Admin moves the page, `follow` replaces the frame's entry and dispatches `popstate`.
 *
 * Not intercepted: a form that posts adds one entry of the frame's own, and so do a change to the
 * fragment through `location.hash` and the Navigation API, which have added the entry before
 * any event says so.
 */
export function watchHistory(
  moved: (route: string, move: PathMove) => Promise<void>,
  // How the page loads a link's address in place of its own entry. Tests pass their own.
  load: (url: string) => void = (url) => window.location.replace(url),
): HistoryWatch {
  const { history } = window;
  const { pushState, replaceState } = history;
  let route = currentRoute();
  // The state the app gave each route, so following Admin back to one gives it back.
  const states = new Map<string, unknown>([[route, history.state]]);

  const report = (move: PathMove) => {
    const next = currentRoute();
    states.set(next, history.state);
    if (next !== route) {
      route = next;
      void moved(next, move);
    }
  };

  const push: History['pushState'] = (data, unused, url) => {
    if (refuses(url)) {
      return;
    }
    replaceState.call(history, data, unused, url);
    report('push');
  };
  const replace: History['replaceState'] = (data, unused, url) => {
    if (refuses(url)) {
      return;
    }
    replaceState.call(history, data, unused, url);
    report('replace');
  };
  history.pushState = push;
  history.replaceState = replace;

  const followLink = (event: MouseEvent, inOverlay: boolean) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    // Found through the event's path, which reaches into shadow roots, and read through its
    // attributes, because an SVG link has none of `HTMLAnchorElement`'s properties.
    const link = event.composedPath().find(isLink);
    const target = link?.getAttribute('target') ?? '';
    if (!link || link.hasAttribute('download') || (target !== '' && target !== '_self')) {
      return;
    }
    const url = new URL(link.getAttribute('href') as string, document.baseURI);
    if (url.origin !== window.location.origin || !WEB_PROTOCOLS.has(url.protocol)) {
      // A web page loads in the page's frame, in place of the overlay's. Any other link, such as
      // a `mailto:`, opens as it is, with the click's activation, which is the overlay's.
      if (inOverlay && WEB_PROTOCOLS.has(url.protocol)) {
        event.preventDefault();
        load(url.href);
      }
      return;
    }
    event.preventDefault();
    const go = () => load(url.href);
    const next = routeOf(url);
    if (!isContained(next)) {
      return;
    }
    if (next === route) {
      go();
      return;
    }
    route = next;
    // Admin records the move before the page leaves, so the next document starts where it is.
    moved(next, 'push').then(go, go);
  };
  const onClick = (event: MouseEvent) => followLink(event, false);
  const onOverlayClick = (event: MouseEvent) => followLink(event, true);
  document.addEventListener('click', onClick);
  let overlay: Document | undefined;
  let stopped = false;

  return {
    follow(path) {
      route = path;
      const state = states.get(path) ?? null;
      replaceState.call(history, state, '', path);
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
    },
    watchLinks(next) {
      if (stopped || next === overlay) {
        return;
      }
      // The overlay's previous document, if Admin loaded it again, is done with.
      overlay?.removeEventListener('click', onOverlayClick);
      overlay = next;
      overlay.addEventListener('click', onOverlayClick);
    },
    stop() {
      if (history.pushState === push) {
        history.pushState = pushState;
      }
      if (history.replaceState === replace) {
        history.replaceState = replaceState;
      }
      document.removeEventListener('click', onClick);
      overlay?.removeEventListener('click', onOverlayClick);
      overlay = undefined;
      stopped = true;
    },
  };
}
