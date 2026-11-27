import { OVERLAY_FRAME_NAME } from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addOverlayRoot } from '../src/overlay.ts';
import { FakeAdmin, frame, freshPage, hostExports, settle, startContext } from './fake-admin.ts';

type Sdk = typeof import('../src/index.ts');

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

async function started({ siblings = [] as Window[], exports = hostExports() } = {}) {
  const parent = frame() as unknown as { frames: ArrayLike<Window> };
  parent.frames = Object.assign([window, ...siblings], { length: siblings.length + 1 });
  admin = new FakeAdmin(exports);
  const connecting = sdk.connect();
  admin.connect();
  await admin.start(startContext());
  return {
    admin,
    ghost: await connecting,
    host: exports,
  };
}

function overlay(): { window: Window; root: HTMLElement } {
  overlayFrame = document.createElement('iframe');
  overlayFrame.name = OVERLAY_FRAME_NAME;
  document.body.append(overlayFrame);
  const overlayWindow = overlayFrame.contentWindow as Window;
  // A browser gives the frame's window the frame's name; jsdom doesn't.
  overlayWindow.name = OVERLAY_FRAME_NAME;
  return { window: overlayWindow, root: addOverlayRoot(overlayWindow.document) };
}

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
    expect(document.head.querySelector('style')?.textContent).toContain(
      'overflow: hidden !important; scrollbar-gutter: auto !important;',
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

  it('has Admin show it with the topmost open dialog’s tint, and hide it once none is open', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });
    expect(ghost.overlay.container()).toBe(root);

    const sheet = ghost.overlay.hold('sheet', dialogIn(root));
    sheet.setOpen(true);
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'sheet' });

    const dialog = ghost.overlay.hold('dialog', dialogIn(root));
    dialog.setOpen(true);
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'dialog' });

    dialog.setOpen(false);
    dialog.release();
    await settle();
    expect(host.overlayShown).toHaveBeenLastCalledWith({ tint: 'sheet' });

    sheet.setOpen(false);
    await settle();
    expect(host.overlayHidden).toHaveBeenCalledOnce();
    sheet.release();
    expect(host.overlayShown).toHaveBeenCalledTimes(3);
  });

  it('sets the overlay’s safe area on its document, as Admin lays it out', async () => {
    const { root, window: overlayWindow } = overlay();
    const { admin: fake, ghost } = await started({ siblings: [overlayWindow] });
    const insets = () =>
      ['top', 'right', 'bottom', 'left'].map((edge) =>
        overlayWindow.document.documentElement.style.getPropertyValue(
          `--ghost-safe-area-inset-${edge}`,
        ),
      );
    expect(ghost.overlay.container()).toBe(root);
    expect(insets()).toEqual(['44px', '8px', '65px', '293px']);

    await fake.thread.imports.layoutChanged({
      safeArea: { top: 0, right: 24, bottom: 57, left: 24 },
      overlaySafeArea: { top: 44, right: 32, bottom: 65, left: 32 },
    });

    expect(insets()).toEqual(['44px', '32px', '65px', '32px']);
    expect(document.documentElement.style.getPropertyValue('--ghost-safe-area-inset-left')).toBe(
      '24px',
    );
  });

  it('presses the overlay outside every dialog when Admin says its tint was pressed', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const dialog = dialogIn(root);
    ghost.overlay.hold('dialog', dialog).setOpen(true);
    const presses: [string, EventTarget | null][] = [];
    const keys: string[] = [];
    for (const type of ['pointerdown', 'click']) {
      overlayWindow.document.addEventListener(type, (event) => presses.push([type, event.target]));
    }
    overlayWindow.document.addEventListener('keydown', (event) => keys.push(event.key));

    await admin?.thread.imports.overlayDismissed();

    // A press, not Escape: an alert dialog closes on Escape, but not on a press outside.
    const { body } = overlayWindow.document;
    expect(presses).toEqual([
      ['pointerdown', body],
      ['click', body],
    ]);
    expect(dialog.contains(body)).toBe(false);
    expect(keys).toEqual([]);
  });

  it('ends with the session when Admin rejects showing it as the session ends', async () => {
    const { window: overlayWindow, root } = overlay();
    const exports = hostExports();
    exports.overlayShown.mockRejectedValueOnce(new Error('session_ended: The app was closed'));
    const { ghost } = await started({ siblings: [overlayWindow], exports });
    const ended = new Promise((resolve) => {
      ghost.onSessionEnd(resolve);
    });

    ghost.overlay.hold('dialog', dialogIn(root)).setOpen(true);

    await expect(ended).resolves.toMatchObject({ code: 'session_ended' });
  });

  it('takes no hold for a dialog rendered in the page', async () => {
    const { ghost, host } = await started({ siblings: [overlay().window] });

    const hold = ghost.overlay.hold('dialog', document.createElement('div'));
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
      mode: () => 'light',
      show: async () => {},
      hide: async () => {},
      found: () => {},
      lost,
    });

    const hold = page.hold('dialog', dialogIn(root));
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
    const hold = ghost.overlay.hold('dialog', dialogIn(root));
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

  it('ignores a repeated open or release, and anything after the release', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost, host } = await started({ siblings: [overlayWindow] });

    const hold = ghost.overlay.hold('dialog', dialogIn(root));
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

    const hold = ghost.overlay.hold('dialog', dialogIn(root));
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
    const hold = ghost.overlay.hold('dialog', dialogIn(root));
    hold.release();

    await admin?.thread.imports.overlayDismissed();

    expect(presses).toEqual([]);
  });

  it('follows Admin’s theme while a dialog holds it', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    ghost.overlay.hold('dialog', dialogIn(root));

    await admin?.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' });

    expect(overlayWindow.document.documentElement.style.colorScheme).toBe('dark');
  });

  it('moves focus to the dialog’s first control as it opens', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const element = dialogIn(root, 'First', 'Last');
    const OverlayElement = (overlayWindow as unknown as typeof globalThis).HTMLElement;
    vi.spyOn(OverlayElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);

    ghost.overlay.hold('dialog', element).setOpen(true);

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
    const hold = ghost.overlay.hold('dialog', element);
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

  it('sends Tab round the topmost dialog as it leaves at either end, and in at the near end from outside', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const element = dialogIn(root, 'First', 'Last');
    // jsdom lays nothing out, so every control would count as hidden.
    const OverlayElement = (overlayWindow as unknown as typeof globalThis).HTMLElement;
    const rects = vi
      .spyOn(OverlayElement.prototype, 'getClientRects')
      .mockReturnValue([{}] as unknown as DOMRectList);
    const hold = ghost.overlay.hold('dialog', element);
    hold.setOpen(true);
    const [first, last] = [...element.querySelectorAll('button')];
    const guards = overlayWindow.document.querySelectorAll<HTMLElement>(
      '[data-ghost-overlay-guard]',
    );
    expect([...guards].map((guard) => guard.tabIndex)).toEqual([0, 0]);
    expect(guards[0]?.nextElementSibling).toBe(root);
    expect(guards[1]?.previousElementSibling).toBe(root);

    last?.focus();
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(first);
    guards[0]?.focus();
    expect(overlayWindow.document.activeElement).toBe(last);

    overlayWindow.document.body.focus();
    (overlayWindow.document.activeElement as HTMLElement | null)?.blur();
    guards[0]?.focus();
    expect(overlayWindow.document.activeElement).toBe(first);
    (overlayWindow.document.activeElement as HTMLElement | null)?.blur();
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(last);

    // Radix's hidden native select, a group's other items and a disabled field are passed over.
    const hiddenSelect = overlayWindow.document.createElement('select');
    hiddenSelect.setAttribute('aria-hidden', 'true');
    const otherTab = overlayWindow.document.createElement('button');
    otherTab.tabIndex = -1;
    const fieldset = overlayWindow.document.createElement('fieldset');
    fieldset.disabled = true;
    fieldset.append(overlayWindow.document.createElement('input'));
    element.prepend(hiddenSelect, otherTab, fieldset);
    last?.focus();
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(first);

    rects.mockReturnValue([] as unknown as DOMRectList);
    guards[1]?.focus();
    expect(overlayWindow.document.activeElement).toBe(guards[1]);

    hold.setOpen(false);
    hold.release();
    expect(overlayWindow.document.querySelector('[data-ghost-overlay-guard]')).toBeNull();
  });

  it('makes the dialogs behind the topmost open one inert, so Tab in either direction stays in it', async () => {
    const { root, window: overlayWindow } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    const [outer, inner] = [dialogIn(root, 'Outer'), dialogIn(root, 'Inner')];
    const outerHold = ghost.overlay.hold('dialog', outer);
    outerHold.setOpen(true);
    expect(outer.hasAttribute('inert')).toBe(false);

    const innerHold = ghost.overlay.hold('dialog', inner);
    innerHold.setOpen(true);
    expect([outer.hasAttribute('inert'), inner.hasAttribute('inert')]).toEqual([true, false]);

    innerHold.setOpen(false);
    expect([outer.hasAttribute('inert'), inner.hasAttribute('inert')]).toEqual([false, true]);
    innerHold.release();
    expect(outer.hasAttribute('inert')).toBe(false);
    outerHold.setOpen(false);
    outerHold.release();
  });

  it('copies the page’s theme classes and color scheme to the overlay while a dialog holds it', async () => {
    const { window: overlayWindow, root } = overlay();
    const { ghost } = await started({ siblings: [overlayWindow] });
    document.documentElement.className = 'dark';

    const hold = ghost.overlay.hold('dialog', dialogIn(root));

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

    const hold = ghost.overlay.hold('dialog', dialogIn(root));

    expect(root instanceof HTMLElement).toBe(true);
    expect(button instanceof HTMLButtonElement).toBe(true);
    expect(document.createElement('button') instanceof HTMLButtonElement).toBe(true);
    expect(button instanceof Node).toBe(true);
    expect(button instanceof HTMLInputElement).toBe(false);
    expect({} instanceof Node).toBe(false);
    // An app class named like a DOM class doesn't stand for the overlay's.
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
    ghost.overlay.hold('dialog', dialogIn(first.root)).release();
    const before = first.window.document.createElement('div');
    overlayFrame?.remove();
    // As in a browser: the old document's nodes stay connected, but it has no window.
    Object.defineProperty(first.root, 'isConnected', { value: true });
    Object.defineProperty(first.root.ownerDocument, 'defaultView', { value: null });
    const second = overlay();
    const parent = window.parent as unknown as { frames: ArrayLike<Window> };
    parent.frames = Object.assign([window, second.window], { length: 2 });

    expect(ghost.overlay.container()).toBe(second.root);
    const hold = ghost.overlay.hold('dialog', dialogIn(second.root));
    expect(second.window.document.createElement('div') instanceof HTMLElement).toBe(true);
    expect(before instanceof HTMLElement).toBe(false);
    hold.release();
  });
});
