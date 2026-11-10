import { OVERLAY_FRAME_NAME, type HostExports } from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { FakeAdmin, frame, freshPage, hostExports, settle, startContext } from './fake-admin.ts';

type Sdk = typeof import('../src/index.ts');

// For a dialog whose show Admin doesn't refuse.
const noRefusal = () => {};
let sdk: Sdk;
let admin: FakeAdmin | undefined;
let overlayFrame: HTMLIFrameElement | undefined;

beforeEach(async () => {
  freshPage();
  vi.resetModules();
  sdk = await import('../src/index.ts');
});

afterEach(async () => {
  admin?.close();
  admin = undefined;
  overlayFrame?.remove();
  overlayFrame = undefined;
  window.name = '';
  await settle();
  vi.restoreAllMocks();
});

/**
 * Starts the app in a frame whose parent holds `siblings`, as Admin's window holds the page frame
 * and the overlay frame.
 */
async function started({
  siblings = [] as Window[],
  exports = hostExports() as Partial<HostExports>,
} = {}) {
  const parent = frame() as unknown as { frames: ArrayLike<Window> };
  parent.frames = Object.assign([window, ...siblings], { length: siblings.length + 1 });
  admin = new FakeAdmin(exports);
  const connecting = sdk.connect();
  admin.connect();
  await admin.start(startContext());
  return { ghost: await connecting, host: exports as ReturnType<typeof hostExports> };
}

/** A same-origin frame Admin named as the overlay, with the root the SDK in it adds. */
function overlay(): { window: Window; root: HTMLElement } {
  overlayFrame = document.createElement('iframe');
  overlayFrame.name = OVERLAY_FRAME_NAME;
  document.body.append(overlayFrame);
  const overlayWindow = overlayFrame.contentWindow as Window;
  // A browser gives the frame's window the frame's name; jsdom doesn't.
  overlayWindow.name = OVERLAY_FRAME_NAME;
  const root = overlayWindow.document.createElement('div');
  root.setAttribute('data-ghost-overlay-root', '');
  overlayWindow.document.body.append(root);
  return { window: overlayWindow, root };
}

/** A dialog's content element, rendered into the overlay's root. */
function dialogIn(root: HTMLElement, ...controls: string[]): HTMLElement {
  const dialog = root.ownerDocument.createElement('div');
  dialog.setAttribute('role', 'dialog');
  for (const label of controls) {
    const button = root.ownerDocument.createElement('button');
    button.textContent = label;
    dialog.append(button);
  }
  root.append(dialog);
  return dialog;
}

/** Lays `element` out at `width`, which jsdom doesn't do. */
function sized(element: HTMLElement, width: number): HTMLElement {
  Object.defineProperty(element, 'offsetWidth', { configurable: true, get: () => width });
  return element;
}

describe('in the overlay document', () => {
  it('never starts the app, and gives the page frame an empty, transparent root', async () => {
    frame();
    window.name = OVERLAY_FRAME_NAME;
    const app = document.createElement('div');
    app.id = 'root';
    document.body.append(app);

    let settled = false;
    void sdk.connect().finally(() => {
      settled = true;
    });
    await settle();

    expect(settled).toBe(false);
    const root = document.querySelector('[data-ghost-overlay-root]');
    expect(root?.parentElement).toBe(document.body);
    expect(document.head.querySelector('style')?.textContent).toContain(
      'body > :not([data-ghost-overlay-root], [data-ghost-overlay-guard]) { display: none !important; }',
    );
    app.remove();
    root?.remove();
  });

  it('adds nothing to the tab’s history', async () => {
    frame();
    window.name = OVERLAY_FRAME_NAME;
    void sdk.connect();
    const entries = history.length;

    history.pushState(null, '', '/redirected');

    expect(history.length).toBe(entries);
    expect(location.pathname).toBe('/redirected');
    document.querySelector('[data-ghost-overlay-root]')?.remove();
  });

  it('adds the root only once', async () => {
    const { prepareOverlayDocument } = await import('../src/overlay.ts');

    prepareOverlayDocument();
    prepareOverlayDocument();

    const roots = document.querySelectorAll('[data-ghost-overlay-root]');
    expect(roots).toHaveLength(1);
    roots[0]?.remove();
  });

  it('waits for the body when it runs before there is one', async () => {
    const { prepareOverlayDocument } = await import('../src/overlay.ts');
    const body = vi.spyOn(document, 'body', 'get').mockReturnValue(null as unknown as HTMLElement);

    prepareOverlayDocument();
    body.mockRestore();
    expect(document.querySelector('[data-ghost-overlay-root]')).toBeNull();

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const root = document.querySelector('[data-ghost-overlay-root]');
    expect(root?.parentElement).toBe(document.body);
    root?.remove();
  });
});

describe('the overlay', () => {
  it('renders in the page when Admin has loaded no overlay', async () => {
    const { ghost } = await started();

    expect(ghost.overlay.container()).toBeUndefined();
  });

  it('renders in the page when Admin doesn’t export the overlay calls', async () => {
    const older: Partial<HostExports> = hostExports();
    delete older.overlayShown;
    delete older.overlayHidden;
    const { ghost } = await started({ siblings: [overlay().window], exports: older });

    expect(ghost.overlay.container()).toBeUndefined();
  });

  it('has Admin show it with the topmost open dialog’s tint and width, and hide it once none is open', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });
    expect(ghost.overlay.container()).toBe(root);

    const sheet = ghost.overlay.hold('sheet', sized(dialogIn(root), 384), noRefusal);
    sheet.setOpen(true);
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'sheet', width: 384 });

    const dialog = ghost.overlay.hold('dialog', sized(dialogIn(root), 512), noRefusal);
    dialog.setOpen(true);
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'dialog', width: 512 });

    dialog.setOpen(false);
    dialog.release();
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'sheet', width: 384 });

    sheet.setOpen(false);
    await settle();
    expect(host.overlayHidden).toHaveBeenCalledOnce();
    sheet.release();
    expect(host.overlayShown).toHaveBeenCalledTimes(3);
  });

  it('has Admin resize it as the topmost open dialog’s width changes', async () => {
    const { root, window: overlayWindow } = overlay();
    const observed: Element[] = [];
    let resized = () => {};
    // jsdom has no ResizeObserver. The SDK uses the overlay's, as the dialogs live there.
    Object.assign(overlayWindow, {
      ResizeObserver: class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(element: Element) {
          observed.push(element);
        }
        unobserve() {}
        disconnect() {}
      },
    });
    const { ghost, host } = await started({ siblings: [overlayWindow] });
    const element = sized(dialogIn(root), 512);
    ghost.overlay.hold('dialog', element, noRefusal).setOpen(true);
    await settle();
    expect(observed).toEqual([element]);

    sized(element, 768);
    resized();
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'dialog', width: 768 });

    // Nothing is sent again for a width that hasn't changed.
    resized();
    await settle();
    expect(host.overlayShown).toHaveBeenCalledTimes(2);
  });

  it('sends a width of at least a pixel, for a dialog not laid out yet', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });

    ghost.overlay.hold('dialog', sized(dialogIn(root), 0), noRefusal).setOpen(true);
    await settle();

    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'dialog', width: 1 });
  });

  it('presses the overlay outside every dialog when Admin says its tint was pressed', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const dialog = dialogIn(root);
    ghost.overlay.hold('dialog', dialog, noRefusal).setOpen(true);
    const presses: [string, EventTarget | null][] = [];
    const keys: string[] = [];
    for (const type of ['pointerdown', 'click']) {
      overlayWindow.document.addEventListener(type, (event) => presses.push([type, event.target]));
    }
    overlayWindow.document.addEventListener('keydown', (event) => keys.push(event.key));

    await admin?.thread.imports.overlayDismissed();

    // A press, not Escape: a dialog that stays open when pressed outside, such as an alert
    // dialog, still closes on Escape.
    const { body } = overlayWindow.document;
    expect(presses).toEqual([
      ['pointerdown', body],
      ['click', body],
    ]);
    expect(dialog.contains(body)).toBe(false);
    expect(keys).toEqual([]);
  });

  it('sends what opened to the page when Admin refuses to show it', async () => {
    const { window: overlayWindow, root } = overlay();
    const exports = hostExports();
    exports.overlayShown.mockRejectedValueOnce(new Error('rejected: Not right now'));
    const { ghost, host } = await started({ siblings: [overlayWindow], exports });
    const keys: string[] = [];
    overlayWindow.document.addEventListener('keydown', (event) => keys.push(event.key));
    const closed = vi.fn();
    const refused = vi.fn();
    // A dialog that holds the overlay but isn't open has nothing to show, so it isn't sent.
    ghost.overlay.hold('dialog', dialogIn(root), closed);
    const hold = ghost.overlay.hold('dialog', dialogIn(root), refused);

    hold.setOpen(true);

    await vi.waitFor(() => expect(refused).toHaveBeenCalledOnce());
    expect(closed).not.toHaveBeenCalled();
    // Nothing is closed for it.
    expect(keys).toEqual([]);
    // It leaves the overlay, and Admin is asked again the next time a dialog opens there.
    hold.release();
    const next = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    next.setOpen(true);
    await settle();
    expect(host.overlayShown).toHaveBeenCalledTimes(2);
  });

  it('sends every open dialog to the page when Admin refuses a new tint, as the overlay stays hidden', async () => {
    const { window: overlayWindow, root } = overlay();
    const exports = hostExports();
    exports.overlayShown
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rejected: Not right now'));
    const { ghost } = await started({ siblings: [overlayWindow], exports });
    const sheetRefused = vi.fn();
    const dialogRefused = vi.fn();
    const sheet = ghost.overlay.hold('sheet', dialogIn(root), sheetRefused);
    sheet.setOpen(true);
    await settle();

    ghost.overlay.hold('dialog', dialogIn(root), dialogRefused).setOpen(true);

    await vi.waitFor(() => expect(dialogRefused).toHaveBeenCalledOnce());
    expect(sheetRefused).toHaveBeenCalledOnce();
  });

  it('ignores a refusal that a later request has replaced', async () => {
    const { window: overlayWindow, root } = overlay();
    const exports = hostExports();
    let refuse!: (error: Error) => void;
    exports.overlayShown.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          refuse = reject;
        }),
    );
    const { ghost, host } = await started({ siblings: [overlayWindow], exports });
    const refused = vi.fn();
    const hold = ghost.overlay.hold('dialog', dialogIn(root), refused);

    hold.setOpen(true);
    await settle();
    hold.setOpen(false);
    hold.setOpen(true);
    await settle();
    refuse(new Error('rejected: Not right now'));
    await settle();

    expect(refused).not.toHaveBeenCalled();
    hold.setOpen(false);
    await settle();
    expect(host.overlayHidden).toHaveBeenCalledTimes(2);
  });

  it('takes no hold for a dialog rendered in the page', async () => {
    const { ghost, host } = await started({ siblings: [overlay().window] });

    const hold = ghost.overlay.hold('dialog', document.createElement('div'), noRefusal);
    hold.setOpen(true);
    hold.release();
    await settle();

    expect(host.overlayShown).not.toHaveBeenCalled();
    expect(host.overlayHidden).not.toHaveBeenCalled();
  });

  it('has the page follow a link in a dialog in the overlay', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });
    expect(ghost.overlay.container()).toBe(root);
    const link = overlayWindow.document.createElement('a');
    link.setAttribute('href', '/episodes/12');
    dialogIn(root).append(link);

    link.click();
    await settle();

    expect(host.pathChanged).toHaveBeenCalledExactlyOnceWith('/episodes/12', 'push');
  });

  it('loads the page again when the overlay’s document goes under a dialog', async () => {
    const { PageOverlay } = await import('../src/overlay.ts');
    const { root, window: overlayWindow } = overlay();
    const parent = frame() as unknown as { frames: ArrayLike<Window> };
    parent.frames = Object.assign([window, overlayWindow], { length: 2 });
    const lost = vi.fn();
    const page = new PageOverlay({
      supported: true,
      mode: () => 'light',
      show: async () => {},
      hide: async () => {},
      found: () => {},
      lost,
    });

    const hold = page.hold('dialog', dialogIn(root), noRefusal);
    overlayWindow.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
    expect(lost).not.toHaveBeenCalled();
    overlayWindow.dispatchEvent(new Event('pagehide'));
    expect(lost).toHaveBeenCalledOnce();

    hold.release();
    overlayWindow.dispatchEvent(new Event('pagehide'));
    expect(lost).toHaveBeenCalledOnce();
  });

  it('has Admin hide it when the page’s own document goes under a dialog', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });
    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    hold.setOpen(true);
    await settle();

    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
    await settle();
    expect(host.overlayHidden).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(host.overlayHidden).toHaveBeenCalledOnce();
    hold.release();
  });

  it('reloads the app’s page when the overlay’s document goes under a dialog', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);

    // jsdom can't reload a page; it only reports that it was asked to.
    expect(() => overlayWindow.dispatchEvent(new Event('pagehide'))).not.toThrow();
    hold.release();
  });

  it('ignores a repeated open or release, and anything after the release', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });

    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    hold.setOpen(true);
    hold.setOpen(true);
    hold.release();
    hold.release();
    hold.setOpen(true);
    await settle();

    expect(host.overlayShown).toHaveBeenCalledOnce();
    expect(host.overlayHidden).toHaveBeenCalledOnce();
  });

  it('shows again after Admin fails to hide it, as the session has ended there', async () => {
    const { root, window: overlayWindow } = overlay();
    const exports = hostExports();
    exports.overlayHidden.mockRejectedValueOnce(new Error('rejected: Not started'));
    const { ghost, host } = await started({ siblings: [overlayWindow], exports });

    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    hold.setOpen(true);
    hold.setOpen(false);
    await settle();
    hold.setOpen(true);
    await settle();

    expect(host.overlayShown).toHaveBeenCalledTimes(2);
  });

  it('does nothing when Admin says its tint was pressed and no dialog holds the overlay', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const presses: Event[] = [];
    overlayWindow.document.addEventListener('pointerdown', (event) => presses.push(event));
    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    hold.release();

    await admin?.thread.imports.overlayDismissed();

    expect(presses).toEqual([]);
  });

  it('follows Admin’s theme while a dialog holds it', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    ghost.overlay.hold('dialog', dialogIn(root), noRefusal);

    await admin?.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' });

    expect(overlayWindow.document.documentElement.style.colorScheme).toBe('dark');
  });

  it('moves focus to the dialog’s first control as it opens', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const element = dialogIn(root, 'First', 'Last');
    // jsdom lays nothing out, so every control would count as hidden.
    const OverlayElement = (overlayWindow as unknown as typeof globalThis).HTMLElement;
    vi.spyOn(OverlayElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);

    ghost.overlay.hold('dialog', element, noRefusal).setOpen(true);

    await vi.waitFor(() =>
      expect(overlayWindow.document.activeElement).toBe(element.querySelector('button')),
    );
  });

  it('moves focus into the dialog again once the overlay’s frame has painted', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const element = dialogIn(root, 'First');
    const OverlayElement = (overlayWindow as unknown as typeof globalThis).HTMLElement;
    vi.spyOn(OverlayElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(overlayWindow, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const hold = ghost.overlay.hold('dialog', element, noRefusal);
    hold.setOpen(true);
    const button = element.querySelector('button');
    await vi.waitFor(() => expect(overlayWindow.document.activeElement).toBe(button));

    // As Firefox and WebKit do with focus moved into a frame that has only just become visible.
    button?.blur();
    frames.shift()?.(0);
    frames.shift()?.(0);

    expect(overlayWindow.document.activeElement).toBe(button);
    hold.setOpen(false);
    hold.release();
  });

  it('sends Tab round the topmost dialog as it leaves at either end', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const element = dialogIn(root, 'First', 'Last');
    // jsdom lays nothing out, so every control would count as hidden.
    const OverlayElement = (overlayWindow as unknown as typeof globalThis).HTMLElement;
    const rects = vi
      .spyOn(OverlayElement.prototype, 'getClientRects')
      .mockReturnValue([{}] as unknown as DOMRectList);
    const hold = ghost.overlay.hold('dialog', element, noRefusal);
    hold.setOpen(true);
    const [first, last] = [...element.querySelectorAll('button')];
    const guards = overlayWindow.document.querySelectorAll<HTMLElement>(
      '[data-ghost-overlay-guard]',
    );
    expect([...guards].map((guard) => guard.tabIndex)).toEqual([0, 0]);
    expect(guards[0]?.nextElementSibling).toBe(root);
    expect(guards[1]?.previousElementSibling).toBe(root);

    // Tab past the last control lands on the guard after the root, and goes round to the first.
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(first);
    guards[0]?.focus();
    expect(overlayWindow.document.activeElement).toBe(last);

    // Controls that can't take focus, or are out of the Tab order, are passed over: the native
    // select Radix hides behind its own, a group's items but the current one, a disabled field.
    const hiddenSelect = overlayWindow.document.createElement('select');
    hiddenSelect.setAttribute('aria-hidden', 'true');
    const otherTab = overlayWindow.document.createElement('button');
    otherTab.tabIndex = -1;
    const fieldset = overlayWindow.document.createElement('fieldset');
    fieldset.disabled = true;
    fieldset.append(overlayWindow.document.createElement('input'));
    element.prepend(hiddenSelect, otherTab, fieldset);
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(first);

    // A dialog with nothing to focus leaves focus where it is.
    rects.mockReturnValue([] as unknown as DOMRectList);
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(guards[1]);

    hold.setOpen(false);
    hold.release();
    expect(overlayWindow.document.querySelector('[data-ghost-overlay-guard]')).toBeNull();
  });

  it('copies the page’s theme classes and color scheme to the overlay while a dialog holds it', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    document.documentElement.className = 'dark';

    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);

    expect(overlayWindow.document.documentElement.className).toBe('dark');
    expect(overlayWindow.document.documentElement.style.colorScheme).toBe('light');
    hold.release();
    document.documentElement.className = '';
  });

  it('makes the page’s instanceof checks accept the overlay’s nodes while a dialog holds it', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const button = overlayWindow.document.createElement('button');
    expect(button instanceof Node).toBe(false);

    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);

    expect(root instanceof HTMLElement).toBe(true);
    expect(button instanceof HTMLButtonElement).toBe(true);
    // The page's own nodes still are.
    expect(document.createElement('button') instanceof HTMLButtonElement).toBe(true);
    expect(button instanceof Node).toBe(true);
    expect(button instanceof HTMLInputElement).toBe(false);
    expect({} instanceof Node).toBe(false);
    // A class of the page's own that shares a name with one of the overlay's DOM classes is
    // left as it is: only the page's DOM classes stand for the overlay's.
    class Text extends HTMLElement {}
    expect(overlayWindow.document.createTextNode('') instanceof Text).toBe(false);
    // Once the overlay's frame holds a document on another origin, its window can't be read.
    Object.defineProperty(overlayWindow, 'Node', {
      configurable: true,
      get() {
        throw new DOMException(
          'Blocked a frame from accessing a cross-origin frame',
          'SecurityError',
        );
      },
    });
    expect({} instanceof Node).toBe(false);
    delete (overlayWindow as unknown as Record<string, unknown>).Node;

    hold.release();

    expect(button instanceof HTMLButtonElement).toBe(false);
    expect(document.createElement('button') instanceof HTMLButtonElement).toBe(true);
  });

  it('accepts only the current overlay’s nodes once Admin loads the overlay again', async () => {
    const first = overlay();
    const { ghost } = await started({ siblings: [first.window] });
    ghost.overlay.hold('dialog', dialogIn(first.root), noRefusal).release();
    const before = first.window.document.createElement('div');
    overlayFrame?.remove();
    // As in a browser, where the old document's nodes stay connected to it once it's gone, but
    // it has no window.
    Object.defineProperty(first.root, 'isConnected', { value: true });
    Object.defineProperty(first.root.ownerDocument, 'defaultView', { value: null });
    const second = overlay();
    const parent = window.parent as unknown as { frames: ArrayLike<Window> };
    parent.frames = Object.assign([window, second.window], { length: 2 });

    expect(ghost.overlay.container()).toBe(second.root);
    const hold = ghost.overlay.hold('dialog', dialogIn(second.root), noRefusal);
    expect(second.window.document.createElement('div') instanceof HTMLElement).toBe(true);
    expect(before instanceof HTMLElement).toBe(false);
    hold.release();
  });

  it('takes a new dialog without a click only while another is open, as Admin does', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    // jsdom has no user activation, which the SDK then treats as always active.
    const page = { isActive: true };
    const inOverlay = { isActive: false };
    Object.defineProperty(navigator, 'userActivation', { configurable: true, value: page });
    Object.defineProperty(overlayWindow.navigator, 'userActivation', {
      configurable: true,
      value: inOverlay,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, 'userActivation');
    });
    const hold = ghost.overlay.hold('dialog', dialogIn(root), noRefusal);
    hold.setOpen(true);
    page.isActive = false;

    expect(ghost.overlay.container()).toBe(root);

    // Closing, but still held through its closing animation.
    hold.setOpen(false);
    expect(ghost.overlay.container()).toBeUndefined();

    // A click in the overlay, such as on the closing dialog's button, reaches Admin but not the
    // page.
    inOverlay.isActive = true;
    expect(ghost.overlay.container()).toBe(root);
  });
});
