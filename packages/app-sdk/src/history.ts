import { normaliseAppPath, type PathMove } from '@tryghost/app-contracts';

/**
 * The page's route: the path, query and fragment of its URL, in the normalised form Admin
 * stores app paths in.
 */
export function currentRoute(): string {
  const { pathname, search, hash } = window.location;
  return normaliseAppPath(`${pathname}${search}${hash}`);
}

/** Whether a node is an HTML or SVG link, which the browser follows when it's clicked. */
function isLink(node: EventTarget): node is Element {
  return (
    (node instanceof HTMLAnchorElement || (node instanceof SVGElement && node.localName === 'a')) &&
    node.hasAttribute('href')
  );
}

export interface HistoryWatch {
  /**
   * Puts the page at `path` without adding a history entry, because Admin moved it there, and
   * dispatches `popstate` so the app's router shows it.
   */
  follow(path: string): void;
  /** Gives the page its own history methods and links back. */
  stop(): void;
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
  // The state the app gave each route, so following Admin back to one gives it back.
  const states = new Map<string, unknown>();
  let route = currentRoute();

  const report = (move: PathMove) => {
    const next = currentRoute();
    states.set(next, history.state);
    if (next !== route) {
      route = next;
      void moved(next, move);
    }
  };

  const push: History['pushState'] = (data, unused, url) => {
    replaceState.call(history, data, unused, url);
    report('push');
  };
  const replace: History['replaceState'] = (data, unused, url) => {
    replaceState.call(history, data, unused, url);
    report('replace');
  };
  history.pushState = push;
  history.replaceState = replace;

  const onClick = (event: MouseEvent) => {
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
    if (url.origin !== window.location.origin) {
      return;
    }
    event.preventDefault();
    const go = () => load(url.href);
    const next = normaliseAppPath(`${url.pathname}${url.search}${url.hash}`);
    if (next === route) {
      go();
      return;
    }
    route = next;
    // Admin records the move before the page leaves, so the next document starts where it is.
    moved(next, 'push').then(go, go);
  };
  document.addEventListener('click', onClick);

  return {
    follow(path) {
      route = path;
      const state = states.get(path) ?? null;
      replaceState.call(history, state, '', path);
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
    },
    stop() {
      if (history.pushState === push) {
        history.pushState = pushState;
      }
      if (history.replaceState === replace) {
        history.replaceState = replaceState;
      }
      document.removeEventListener('click', onClick);
    },
  };
}
