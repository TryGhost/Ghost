import { OVERLAY_FRAME_NAME, type OverlayTint, type SafeArea } from '@tryghost/app-contracts';

import { applySafeArea } from './safe-area.ts';
import type { GhostOverlay, OverlayHold } from './types.ts';

const ROOT_ATTRIBUTE = 'data-ghost-overlay-root';

const GUARD_ATTRIBUTE = 'data-ghost-overlay-guard';

/**
 * The overlay root's own function for moving focus within the overlay. Browsers can ignore focus
 * moved by the page's script while its frame has neither focus nor user activation.
 */
const FOCUS = Symbol.for('ghost.overlay.focus');

interface OverlayRoot extends HTMLElement {
  [FOCUS]: (element: HTMLElement) => void;
}

export function addOverlayRoot(overlay: Document): HTMLElement {
  const root = overlay.createElement('div') as unknown as OverlayRoot;
  root.setAttribute(ROOT_ATTRIBUTE, '');
  // Focusing an element in a window that isn't focused doesn't always move focus there.
  root[FOCUS] = (element) => {
    overlay.defaultView?.focus();
    element.focus({ preventScroll: true });
  };
  overlay.body.append(root);
  return root;
}

export function isOverlayDocument(): boolean {
  return (
    typeof window !== 'undefined' && window.parent !== window && window.name === OVERLAY_FRAME_NAME
  );
}

let prepared = false;

/**
 * Turns the overlay document into a transparent root for the page frame to render into. An app
 * that renders before `connect()` stays hidden; its stylesheets stay for its dialogs.
 */
export function prepareOverlayDocument() {
  if (prepared) {
    return;
  }
  prepared = true;
  // A router that redirects as it loads would leave an entry for Back in the hidden overlay.
  history.pushState = history.replaceState.bind(history);
  const prepare = () => {
    const style = document.createElement('style');
    style.textContent = `html, body { background: transparent !important; overflow: hidden !important; scrollbar-gutter: auto !important; }
body > :not([${ROOT_ATTRIBUTE}], [${GUARD_ATTRIBUTE}]) { display: none !important; }`;
    document.head.append(style);
    addOverlayRoot(document);
  };
  if (document.body) {
    prepare();
  } else {
    document.addEventListener('DOMContentLoaded', prepare, { once: true });
  }
}

/**
 * Makes `instanceof` against the page's DOM classes accept the overlay's nodes, which come from
 * another window. Without it, Radix ignores presses outside a dialog, select or menu in the
 * overlay. Returns the function that undoes it.
 */
function shareRealm(overlay: Window): () => void {
  const page = window as unknown as Record<string, unknown>;
  const ownHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Node, Symbol.hasInstance, {
    configurable: true,
    // Subclasses such as `HTMLElement` inherit this, so `this` is the class being checked.
    value(this: { name: string }, value: unknown): boolean {
      if (ownHasInstance.call(this, value)) {
        return true;
      }
      // Not an app class that shares a DOM class's name.
      if (typeof value !== 'object' || value === null || page[this.name] !== this) {
        return false;
      }
      try {
        const counterpart = (overlay as unknown as Record<string, unknown>)[this.name];
        return typeof counterpart === 'function' && ownHasInstance.call(counterpart, value);
      } catch {
        // The overlay's frame holds a document on another origin.
        return false;
      }
    },
  });
  return () => {
    delete (Node as unknown as Record<symbol, unknown>)[Symbol.hasInstance];
  };
}

function findOverlayRoot(): OverlayRoot | undefined {
  const { frames } = window.parent;
  for (let index = 0; index < frames.length; index += 1) {
    try {
      const frame = frames[index];
      if (frame && frame !== window && frame.name === OVERLAY_FRAME_NAME) {
        const root = frame.document.querySelector<OverlayRoot>(`[${ROOT_ATTRIBUTE}]`);
        if (root) {
          return root;
        }
      }
    } catch {
      // A frame on another origin: not this app's overlay.
    }
  }
  return undefined;
}

const TABBABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function tabbables(container: HTMLElement): HTMLElement[] {
  const view = container.ownerDocument.defaultView;
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[aria-hidden="true"], [inert]') &&
      element.getClientRects().length > 0 &&
      view?.getComputedStyle(element).visibility !== 'hidden',
  );
}

/**
 * Moves focus into `dialog`. A dialog's own focus handling checks the page's document, sees no
 * change there and falls back to focusing the dialog itself.
 */
function focusInto(root: OverlayRoot, dialog: HTMLElement, preferred: HTMLElement | null) {
  const overlay = dialog.ownerDocument;
  const active = overlay.activeElement;
  const inDialog = (element: Element | null): element is HTMLElement =>
    element instanceof HTMLElement && element !== dialog && dialog.contains(element);
  const target = inDialog(preferred)
    ? preferred
    : inDialog(active)
      ? active
      : tabbables(dialog).find((element) => element.tagName !== 'A');
  if (!target || (target === active && overlay.hasFocus())) {
    return;
  }
  root[FOCUS](target);
}

interface HoldState {
  tint: OverlayTint;
  element: HTMLElement;
  open: boolean;
}

export interface PageOverlayOptions {
  mode: () => 'light' | 'dark';
  show: (tint: OverlayTint) => Promise<void>;
  hide: () => Promise<void>;
  found: (overlay: Document) => void;
  /** Called when the overlay's document goes while a dialog holds it, taking the dialog along. */
  lost: () => void;
}

/**
 * The page frame's side of the overlay. The overlay document is on the page's origin, so the
 * page renders its dialogs and sheets straight into it, from the same React tree. Code in the
 * page reads the page's own `document`, so this class handles focus and Tab across the frames.
 */
export class PageOverlay implements GhostOverlay {
  readonly #options: PageOverlayOptions;
  readonly #holds = new Set<HoldState>();
  #root: OverlayRoot | undefined;
  #shown: OverlayTint | undefined;
  #safeArea: SafeArea | undefined;
  #returnFocus: Element | null = null;
  #stopHolding: (() => void) | undefined;
  #refocus: (() => void) | undefined;

  constructor(options: PageOverlayOptions) {
    this.#options = options;
  }

  #findRoot(): OverlayRoot | undefined {
    // A frame that loads another document leaves the old root connected but without a window.
    if (!this.#root?.isConnected || !this.#root.ownerDocument.defaultView) {
      this.#root = findOverlayRoot();
      if (this.#root) {
        this.#options.found(this.#root.ownerDocument);
        this.#applySafeArea();
      }
    }
    return this.#root;
  }

  container(): HTMLElement | undefined {
    return this.#findRoot();
  }

  hold(tint: OverlayTint, element: HTMLElement): OverlayHold {
    const root = this.#findRoot();
    if (!root?.contains(element)) {
      // Rendered in the page, because `container()` had nowhere else for it.
      return { setOpen: () => {}, release: () => {} };
    }
    const state: HoldState = { tint, element, open: false };
    if (this.#holds.size === 0) {
      this.#returnFocus = document.activeElement;
      this.#stopHolding = this.#startHolding(root);
    }
    this.#holds.add(state);
    let released = false;
    return {
      setOpen: (open) => {
        if (released || state.open === open) {
          return;
        }
        state.open = open;
        this.#sync();
        if (open) {
          this.#refocus?.();
        }
      },
      release: () => {
        if (released) {
          return;
        }
        released = true;
        this.#holds.delete(state);
        this.#sync();
        if (this.#holds.size === 0) {
          this.#stopHolding?.();
          this.#stopHolding = undefined;
          this.#refocus = undefined;
          window.focus();
          if (this.#returnFocus instanceof HTMLElement && this.#returnFocus.isConnected) {
            this.#returnFocus.focus({ preventScroll: true });
          }
          this.#returnFocus = null;
        }
      },
    };
  }

  /** Admin's tint was pressed: presses outside every dialog, as if beside the topmost one. */
  dismissed() {
    const overlay = this.#root?.ownerDocument;
    if (!overlay?.defaultView || this.#holds.size === 0) {
      return;
    }
    const view = overlay.defaultView as unknown as typeof globalThis;
    const PressEvent = view.PointerEvent ?? view.MouseEvent;
    const init = { bubbles: true, cancelable: true, button: 0 };
    // The whole press: a dialog can wait for the click before it closes.
    overlay.body.dispatchEvent(new PressEvent('pointerdown', init));
    overlay.body.dispatchEvent(new view.MouseEvent('click', init));
  }

  themeChanged() {
    const root = this.#root;
    if (root && this.#holds.size > 0) {
      root.ownerDocument.documentElement.style.colorScheme = this.#options.mode();
    }
  }

  layoutChanged(safeArea: SafeArea) {
    this.#safeArea = safeArea;
    this.#applySafeArea();
  }

  #applySafeArea() {
    if (this.#root && this.#safeArea) {
      applySafeArea(this.#root.ownerDocument.documentElement, this.#safeArea);
    }
  }

  #topmost(): HTMLElement | undefined {
    return [...this.#holds].filter((hold) => hold.open && hold.element.isConnected).at(-1)?.element;
  }

  /** Lets Tab pass over the dialogs behind the topmost, as its own focus trap would. */
  #inertBehind() {
    const topmost = this.#topmost();
    for (const hold of this.#holds) {
      hold.element.toggleAttribute('inert', topmost !== undefined && hold.element !== topmost);
    }
  }

  #sync() {
    this.#inertBehind();
    const next = [...this.#holds].filter((hold) => hold.open).at(-1)?.tint;
    if (next === this.#shown) {
      return;
    }
    this.#shown = next;
    (next ? this.#options.show(next) : this.#options.hide()).catch(() => {
      // The session ended, and the overlay with it.
    });
  }

  #startHolding(root: OverlayRoot): () => void {
    const overlay = root.ownerDocument;
    // `#findRoot` only returns a root whose document has a window.
    const view = overlay.defaultView as Window;
    const page = document.documentElement;
    const mirror = () => {
      overlay.documentElement.className = page.className;
      overlay.documentElement.style.colorScheme = this.#options.mode();
    };
    mirror();
    const observer = new MutationObserver(mirror);
    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
    const unshareRealm = shareRealm(view);

    // Focus moves into the topmost dialog when it opens, and when Admin focuses the overlay's
    // frame, which leaves focus on the overlay's body.
    let lastFocused: HTMLElement | null = null;
    const refocus = () => {
      const run = () => {
        const dialog = this.#topmost();
        if (dialog && this.#shown !== undefined) {
          focusInto(root, dialog, lastFocused);
        }
      };
      // A task later, after the dialog's own focus handling; WebKit also ignores focus moved to
      // another frame during a focus event. Again after a paint, as Firefox and WebKit drop focus
      // moved into a frame that has only just become visible.
      setTimeout(() => {
        run();
        view.requestAnimationFrame(() => view.requestAnimationFrame(run));
      }, 0);
    };
    this.#refocus = refocus;
    const onOverlayFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && this.#topmost()?.contains(event.target)) {
        lastFocused = event.target;
      }
    };
    overlay.addEventListener('focusin', onOverlayFocus, true);
    view.addEventListener('focus', refocus);

    // The dialog's own focus trap only works in one document. Guards either side of the root
    // send Tab round to the topmost dialog's other end.
    const guards = (['before', 'after'] as const).map((side) => {
      const guard = overlay.createElement('span');
      guard.tabIndex = 0;
      guard.setAttribute(GUARD_ATTRIBUTE, '');
      guard.style.cssText =
        'position: fixed; width: 1px; height: 1px; opacity: 0; pointer-events: none';
      guard.addEventListener('focus', (event) => {
        const dialog = this.#topmost();
        const controls = dialog ? tabbables(dialog) : [];
        // Focus from outside the dialog, such as the overlay's body, enters at the near end.
        const leaving = root.contains(event.relatedTarget as Node | null);
        const next = (side === 'before') === leaving ? controls.at(-1) : controls[0];
        if (next) {
          root[FOCUS](next);
        }
      });
      if (side === 'before') {
        root.before(guard);
      } else {
        root.after(guard);
      }
      return guard;
    });

    // The overlay's frame can load another document under a dialog, which takes the dialog along.
    const onOverlayGone = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        this.#options.lost();
      }
    };
    // Admin hides the overlay when the page's next document connects, which one on another site
    // never does.
    const onPageGone = (event: PageTransitionEvent) => {
      if (!event.persisted && this.#shown !== undefined) {
        this.#shown = undefined;
        this.#options.hide().catch(() => {});
      }
    };
    view.addEventListener('pagehide', onOverlayGone);
    window.addEventListener('pagehide', onPageGone);
    return () => {
      observer.disconnect();
      unshareRealm();
      view.removeEventListener('pagehide', onOverlayGone);
      window.removeEventListener('pagehide', onPageGone);
      for (const guard of guards) {
        guard.remove();
      }
      overlay.removeEventListener('focusin', onOverlayFocus, true);
      view.removeEventListener('focus', refocus);
    };
  }
}
