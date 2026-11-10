import { OVERLAY_FRAME_NAME, type OverlayTint } from '@tryghost/app-contracts';

import type { GhostOverlay, OverlayHold } from './types.ts';

/** Marks the element in the overlay document that the page frame renders into. */
const ROOT_ATTRIBUTE = 'data-ghost-overlay-root';

/** Marks the focus guards around the root, which keep Tab in the topmost dialog. */
const GUARD_ATTRIBUTE = 'data-ghost-overlay-guard';

/**
 * Whether this document is the app's overlay rather than its page: Admin loads the app's page a
 * second time, in a frame it names `OVERLAY_FRAME_NAME`, for the page to render its dialogs and
 * sheets into. Only Admin sets a frame's name, so the page's own URL can't make it one.
 */
export function isOverlayDocument(): boolean {
  return (
    typeof window !== 'undefined' && window.parent !== window && window.name === OVERLAY_FRAME_NAME
  );
}

let prepared = false;

/**
 * Turns the overlay document into an empty, transparent root for the page frame to render
 * into. Whatever the app renders here itself stays hidden: the app's page normally waits for
 * `connect()`, which never resolves in the overlay, but one that renders first mustn't show
 * a second copy of itself over Admin. The app's stylesheets stay, because they're the ones
 * its dialogs need. Nothing in the overlay adds to the tab's history; the page follows its
 * links (see `watchLinks`).
 */
export function prepareOverlayDocument() {
  if (prepared) {
    return;
  }
  prepared = true;
  // Such as an app's router that redirects as it loads, which would leave an entry for Back to
  // step through in the hidden overlay.
  history.pushState = history.replaceState.bind(history);
  const prepare = () => {
    const style = document.createElement('style');
    style.textContent = `html, body { background: transparent !important; }
body > :not([${ROOT_ATTRIBUTE}], [${GUARD_ATTRIBUTE}]) { display: none !important; }`;
    document.head.append(style);
    const root = document.createElement('div');
    root.setAttribute(ROOT_ATTRIBUTE, '');
    document.body.append(root);
  };
  if (document.body) {
    prepare();
  } else {
    document.addEventListener('DOMContentLoaded', prepare, { once: true });
  }
}

/**
 * Makes the page's `instanceof` checks for DOM nodes accept the overlay's too, while a dialog
 * holds it. The page renders into the overlay's document, but its code, and the libraries it
 * uses, test what they're given against the page's own `Node` and its subclasses, which the
 * overlay's nodes aren't instances of: they come from the overlay's window. Radix, for one,
 * then ignores a press outside a dialog, a select or a menu in the overlay. A check against one
 * of the page's DOM classes also accepts a node of the overlay's class of the same name. Returns
 * the function that undoes it.
 */
function shareRealm(overlay: Window): () => void {
  const page = window as unknown as Record<string, unknown>;
  const ownHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Node, Symbol.hasInstance, {
    configurable: true,
    // `this` is the class being checked, such as `HTMLElement`, which inherits this.
    value(this: { name: string }, value: unknown): boolean {
      if (ownHasInstance.call(this, value)) {
        return true;
      }
      // Only the page's own DOM classes stand for the overlay's, not a class of the app's that
      // shares a name with one.
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

/** The overlay document's root, once Admin has loaded the overlay frame and the SDK in it ran. */
function findOverlayRoot(): HTMLElement | undefined {
  const { frames } = window.parent;
  for (let index = 0; index < frames.length; index += 1) {
    try {
      const frame = frames[index];
      if (frame && frame !== window && frame.name === OVERLAY_FRAME_NAME) {
        const root = frame.document.querySelector<HTMLElement>(`[${ROOT_ATTRIBUTE}]`);
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

/**
 * The controls in `container` that can take focus, in order: not disabled, hidden or invisible,
 * and not taken out of the Tab order.
 */
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
 * Moves focus into `dialog`: to `preferred` if it's still in it, else to the control in it that
 * has focus, else to its first control. A dialog's own focus handling checks the page's document
 * to see whether focusing worked, finds nothing changed there, and falls back to focusing the
 * dialog itself; and focusing an element in a window that isn't focused doesn't always move
 * focus there, so the overlay's window is focused first.
 */
function focusInto(dialog: HTMLElement, preferred: HTMLElement | null) {
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
  overlay.defaultView?.focus();
  target.focus({ preventScroll: true });
}

/** Whether the publisher has just clicked or typed in `view`. */
function isActive(view: Window | null): boolean {
  return view !== null && (view.navigator.userActivation?.isActive ?? true);
}

interface HoldState {
  tint: OverlayTint;
  element: HTMLElement;
  open: boolean;
  refused: () => void;
}

export interface PageOverlayOptions {
  /** Whether Admin exports the overlay calls at all. */
  supported: boolean;
  /** The theme's mode now, for the overlay document's `color-scheme`. */
  mode: () => 'light' | 'dark';
  /** Asks Admin to show the overlay, as a dialog's or a sheet's, as wide as `width`. */
  show: (tint: OverlayTint, width: number) => Promise<void>;
  hide: () => Promise<void>;
  /** Called with each overlay document the page renders into, for the page to follow its links. */
  found: (overlay: Document) => void;
  /** Called when the overlay's document goes while a dialog holds it, taking the dialog along. */
  lost: () => void;
}

/**
 * The page frame's side of the overlay: where its dialogs and sheets render, and when Admin
 * shows them over all of Admin.
 *
 * The overlay document is on the page's own origin, so the page renders straight into it, from
 * the same React tree, and nothing else crosses the channel but "shown" and "hidden". Each
 * dialog or sheet holds the overlay while it's mounted, and is open from when it opens until it
 * starts to close. Admin shows the overlay with the tint of the topmost open one, and only as
 * wide as it: the overlay frame covers the whole window, so the dialog lays out where Admin's
 * own would, and Admin clips the frame to a strip that it places and the dialog's width sizes.
 *
 * Code that runs in the page frame reads the page's own `document`, not the overlay's, so the
 * overlay takes over what that breaks: it moves focus between the frames, keeps Tab inside the
 * topmost dialog, and copies the page's theme classes to the overlay document.
 */
export class PageOverlay implements GhostOverlay {
  readonly #options: PageOverlayOptions;
  readonly #holds = new Set<HoldState>();
  #root: HTMLElement | undefined;
  #shown: { tint: OverlayTint; width: number } | undefined;
  // Follows the width of each dialog holding the overlay. Made from the overlay's window, which
  // the dialogs live in, while one holds it.
  #resizes: ResizeObserver | undefined;
  // Counts the requests to show or hide the overlay, so a refusal only undoes the latest.
  #requests = 0;
  #returnFocus: Element | null = null;
  #stopHolding: (() => void) | undefined;
  // Moves focus into the topmost open dialog, in a task of its own. Set while a dialog holds the
  // overlay.
  #refocus: (() => void) | undefined;

  constructor(options: PageOverlayOptions) {
    this.#options = options;
  }

  #findRoot(): HTMLElement | undefined {
    // A root stays connected to its document after the frame has moved on to another, which
    // leaves the old one without a window.
    if (!this.#root?.isConnected || !this.#root.ownerDocument.defaultView) {
      this.#root = findOverlayRoot();
      if (this.#root) {
        this.#options.found(this.#root.ownerDocument);
      }
    }
    return this.#root;
  }

  container(): HTMLElement | undefined {
    if (!this.#options.supported) {
      return undefined;
    }
    const root = this.#findRoot();
    // Admin shows the overlay only right after the publisher clicks or types in the app, in the
    // page or in the overlay: a click in a frame reaches Admin, above it, but not the frame
    // beside it. A dialog that opens without that, such as one opened when the page loads, stays
    // in the page. While one is open, Admin needs no new click, and the overlay stays the place
    // to render.
    if (
      !root ||
      (!this.#isOpen() && !isActive(window) && !isActive(root.ownerDocument.defaultView))
    ) {
      return undefined;
    }
    return root;
  }

  hold(tint: OverlayTint, element: HTMLElement, refused: () => void): OverlayHold {
    const root = this.#findRoot();
    if (!root?.contains(element)) {
      // Rendered in the page, because `container()` had nowhere else for it.
      return { setOpen: () => {}, release: () => {} };
    }
    const state: HoldState = { tint, element, open: false, refused };
    if (this.#holds.size === 0) {
      this.#returnFocus = document.activeElement;
      this.#stopHolding = this.#startHolding(root);
    }
    this.#holds.add(state);
    this.#resizes?.observe(element);
    let released = false;
    return {
      setOpen: (open) => {
        if (released || state.open === open) {
          return;
        }
        state.open = open;
        this.#sync();
        if (open) {
          // After the dialog's own focus handling, which runs once it has mounted.
          this.#refocus?.();
        }
      },
      release: () => {
        if (released) {
          return;
        }
        released = true;
        this.#holds.delete(state);
        this.#resizes?.unobserve(element);
        this.#sync();
        if (this.#holds.size === 0) {
          this.#stopHolding?.();
          this.#stopHolding = undefined;
          this.#refocus = undefined;
          // Back to the page frame, and to what had focus before the first dialog opened.
          window.focus();
          if (this.#returnFocus instanceof HTMLElement && this.#returnFocus.isConnected) {
            this.#returnFocus.focus({ preventScroll: true });
          }
          this.#returnFocus = null;
        }
      },
    };
  }

  /**
   * Admin's tint was pressed: the overlay gets the press, outside every dialog, as if the
   * publisher had pressed beside the topmost one in the app's area. That dialog closes, unless it
   * keeps itself open when pressed outside, as an alert dialog does.
   */
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

  /** Called when Admin's theme changes, so an open overlay changes with the page. */
  themeChanged() {
    const root = this.#root;
    if (root && this.#holds.size > 0) {
      root.ownerDocument.documentElement.style.colorScheme = this.#options.mode();
    }
  }

  /** Whether a dialog holding the overlay is open, so Admin shows it. */
  #isOpen(): boolean {
    return [...this.#holds].some((hold) => hold.open);
  }

  /** The topmost dialog that's open, of those holding the overlay. */
  #topmost(): HTMLElement | undefined {
    return [...this.#holds].filter((hold) => hold.open && hold.element.isConnected).at(-1)?.element;
  }

  #sync() {
    const topmost = [...this.#holds].filter((hold) => hold.open).at(-1);
    // The width it's laid out at, which its opening animation's scale doesn't change. Read from
    // here: the overlay's frame is hidden until Admin has it, and a hidden frame's rendering,
    // which observers wait for, is held back.
    const next = topmost && {
      tint: topmost.tint,
      width: Math.max(1, Math.round(topmost.element.offsetWidth)),
    };
    if (next?.tint === this.#shown?.tint && next?.width === this.#shown?.width) {
      return;
    }
    this.#shown = next;
    this.#requests += 1;
    const request = this.#requests;
    if (next) {
      // Refused, such as when the publisher's click ran out before Admin heard of it: the
      // overlay stays hidden, and what opened renders in the page instead, where it's seen. A
      // refusal of a request that a later one has replaced changes nothing.
      this.#options.show(next.tint, next.width).catch(() => {
        if (request === this.#requests) {
          this.#shown = undefined;
          for (const hold of [...this.#holds]) {
            if (hold.open) {
              hold.refused();
            }
          }
        }
      });
    } else {
      this.#options.hide().catch(() => {
        // The session ended, and Admin hid the overlay itself.
      });
    }
  }

  /** What the overlay needs while a dialog holds it. Returns the function that undoes it. */
  #startHolding(root: HTMLElement): () => void {
    const overlay = root.ownerDocument;
    // A root only counts while its document has a window (see `#findRoot`).
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
    const Resizes =
      (view as unknown as Partial<typeof globalThis>).ResizeObserver ?? globalThis.ResizeObserver;
    const resizes = Resizes ? new Resizes(() => this.#sync()) : undefined;
    this.#resizes = resizes;

    // Focus moves into the topmost dialog when it opens, and when Admin focuses the overlay's
    // frame as it shows, where focus lands on the overlay's body. The dialog's own focus handling
    // reads the page's document, so it can't tell. Each waits a task, for the dialog's own focus
    // handling and because WebKit ignores focus moving to another frame during a focus event, and
    // tries again once the frame has painted: Firefox and WebKit drop focus moved into a frame
    // that has only just become visible. While the overlay shows, Admin makes the rest of Admin
    // inert, the page frame included, so focus can't land in the page.
    let lastFocused: HTMLElement | null = null;
    const refocus = () => {
      const run = () => {
        const dialog = this.#topmost();
        if (dialog && this.#shown !== undefined) {
          focusInto(dialog, lastFocused);
        }
      };
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

    // Tab stays in the topmost dialog, as the dialog's own focus trap would keep it in one
    // document. A guard before and after the root takes focus as Tab leaves the dialog at either
    // end, and sends it round to the other. In between, Tab is the browser's own.
    const guards = (['before', 'after'] as const).map((side) => {
      const guard = overlay.createElement('span');
      guard.tabIndex = 0;
      guard.setAttribute(GUARD_ATTRIBUTE, '');
      guard.style.cssText =
        'position: fixed; width: 1px; height: 1px; opacity: 0; pointer-events: none';
      guard.addEventListener('focus', () => {
        const dialog = this.#topmost();
        const controls = dialog ? tabbables(dialog) : [];
        (side === 'before' ? controls.at(-1) : controls[0])?.focus();
      });
      if (side === 'before') {
        root.before(guard);
      } else {
        root.after(guard);
      }
      return guard;
    });

    // The overlay's frame can load another document under a dialog, such as for a link the page
    // doesn't follow for it. The dialog goes with the document, but the page still holds it.
    // Neither document goes when the tab only keeps them to come back to.
    const onOverlayGone = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        this.#options.lost();
      }
    };
    // The page's own document can go too, such as for a link in a dialog, and its dialogs with
    // it. Admin hides the overlay when the next document connects, which one elsewhere never does.
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
      resizes?.disconnect();
      this.#resizes = undefined;
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
