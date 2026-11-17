import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  allowUnhandledRequests,
  currentRoute,
  currentUserResponse,
  fakeAdminStats,
  fakeEditorChrome,
  fakeEditorPost,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  renderAdminApp,
  staffRole,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { adminFrameScreen } from '@/layout/admin-frame.screen';
import { sidebarScreen } from '@/layout/sidebar.screen';
import type { GhostSidePanelApi } from './side-panel-api';

const panel = () => page.elementLocator(panelElement());
function panelElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-side-panel]');
  if (!element) {
    throw new Error('The side panel is not rendered');
  }
  return element;
}
const panelState = () =>
  document.querySelector('[data-side-panel]')?.getAttribute('data-side-panel');
const panelLayout = () =>
  document.querySelector('[data-side-panel]')?.getAttribute('data-side-panel-layout');
const panelWidth = () =>
  document.querySelector('[data-side-panel]')?.getBoundingClientRect().width ?? 0;
/** From this window width the panel docks beside the page; below it, it's a window over it. */
const DOCKING_WIDTH = 1600;
const NARROW_WIDTH = 1280;
/** The docked panel's width on a window without room to spare beside the page. */
const PANEL_WIDTH = 400;
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 680;
/** The room between the panel's edge and its content. */
const CONTENT_PADDING = 8;
/** The Admin 7 frame's bezel beside the page, inside the docked panel's width. */
const BEZEL = 8;
/** The window's inset from the frame's edges, as the Admin 7 navigation's. */
const WINDOW_INSET = 16;

function sidePanel(): GhostSidePanelApi {
  const api = window.ghost?.sidePanel;
  if (!api) {
    throw new Error('window.ghost.sidePanel is not installed');
  }
  return api;
}

/** Host content: a frame that counts its loads, so a spec can tell it wasn't reloaded. */
function hostFrame(title = 'Help content') {
  const element = document.createElement('iframe');
  element.title = title;
  element.srcdoc = `<p>${title}</p>`;
  let loads = 0;
  element.addEventListener('load', () => {
    loads += 1;
  });
  return { element, loads: () => loads };
}

/**
 * Resizing the window turns the panel's transitions off for a moment, so a
 * spec that animates the panel waits for the resize to land before rendering.
 */
async function setWindowWidth(width: number) {
  await page.viewport(width, 800);
  await expect.poll(() => window.innerWidth).toBe(width);
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/** Renders Tags with the navigation, in either design, on a window wide enough to dock by default. */
async function renderWithNavigation({ admin7Design = false, width = DOCKING_WIDTH } = {}) {
  await setWindowWidth(width);
  fakeTags([]);
  if (admin7Design) {
    // The Admin 7 frame's top bar shows the site's numbers
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
  }
  await renderAdminApp('/tags', { labs: { admin7Design } });
  await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
  if (admin7Design) {
    // The navigation shows before the Labs config brings the frame, which
    // moves the panel and drops content opened before it
    await expect.poll(sidebarScreen.floatingState).toBe('pinned');
  }
}

const frameWidth = (element: HTMLElement) => element.getBoundingClientRect().width;

/** Whether the page keeps its stacking to itself, so its sticky headers stay under what floats over it. */
function pageIsolated(): boolean {
  for (
    let element = sidebarScreen.shellMain().element().parentElement;
    element;
    element = element.parentElement
  ) {
    if (getComputedStyle(element).isolation === 'isolate') {
      return true;
    }
  }
  return false;
}

function asContributor(): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { boot: { browseMe: { response: me } } };
}

describe('Side panel', () => {
  afterEach(async () => {
    await page.viewport(NARROW_WIDTH, 800);
  });

  it.each([false, true])(
    'shows opened content beside the page: admin7Design %s',
    async (admin7Design) => {
      await renderWithNavigation({ admin7Design });
      const frame = hostFrame();

      expect(sidePanel().open(frame.element)).not.toBeNull();

      await expect.element(panel()).toBeVisible();
      expect(panelLayout()).toBe('docked');
      expect(panel().element().contains(frame.element)).toBe(true);
      await expect.poll(panelWidth).toBe(PANEL_WIDTH + (admin7Design ? BEZEL : 0));
      expect(frameWidth(frame.element)).toBe(PANEL_WIDTH - 2 * CONTENT_PADDING);
      // It moves as the Admin 7 navigation pins and unpins
      const style = getComputedStyle(panelElement());
      expect(style.transitionTimingFunction).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
      expect(style.transitionDuration).toBe('0.52s');
      const pageRight = sidebarScreen.shellMain().element().getBoundingClientRect().right;
      const panelBox = panel().element().getBoundingClientRect();
      expect(pageRight).toBeLessThanOrEqual(panelBox.left);
      // The Admin 7 top bar keeps the full width, with the panel below it
      if (admin7Design) {
        const topBar = adminFrameScreen.topBar().element().getBoundingClientRect();
        expect(panelBox.top).toBeGreaterThanOrEqual(topBar.bottom);
        expect(topBar.right).toBeGreaterThanOrEqual(panelBox.right);
      } else {
        expect(panelBox.top).toBe(0);
      }
      expect(sidePanel().isOpen()).toBe(true);
    },
  );

  it.each([
    {
      how: 'close()',
      close: () => {
        sidePanel().close();
        return Promise.resolve();
      },
      moveFocus: (content: HTMLElement) => {
        content.focus();
        return content;
      },
    },
    {
      how: 'Escape',
      close: () => userEvent.keyboard('{Escape}'),
      // An Escape inside the content is the content's own, so focus leaves for the page
      moveFocus: () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return document.body;
      },
    },
  ])('hides with $how, keeps the content and returns focus', async ({ close, moveFocus }) => {
    await renderWithNavigation();
    const trigger = sidebarScreen.userMenuTrigger();
    trigger.element().focus();
    const frame = hostFrame();
    const onClose = vi.fn();
    sidePanel().open(frame.element, { onClose });
    await expect.element(panel()).toBeVisible();
    const focused = moveFocus(frame.element);
    expect(document.activeElement).toBe(focused);

    await close();

    await expect.poll(panelState).toBe('closed');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(frame.element.isConnected).toBe(true);
    expect(sidePanel().isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger.element());
  });

  it('hides with its handle, returns focus, and reopens without reloading', async () => {
    await renderWithNavigation();
    const trigger = sidebarScreen.userMenuTrigger();
    trigger.element().focus();
    const frame = hostFrame();
    const onClose = vi.fn();
    const handle = sidePanel().open(frame.element, { onClose });
    await expect.poll(frame.loads).toBe(1);
    frame.element.focus();
    expect(document.activeElement).toBe(frame.element);

    handle?.close();
    handle?.close();

    await expect.poll(panelState).toBe('closed');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger.element());

    sidePanel().open(frame.element);
    await expect.element(panel()).toBeVisible();
    expect(frame.loads()).toBe(1);
  });

  it('leaves Escape to a menu that handles it', async () => {
    await renderWithNavigation();
    sidePanel().open(hostFrame().element);
    await expect.element(panel()).toBeVisible();

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect.element(sidebarScreen.profileMenuItem()).not.toBeInTheDocument();
    expect(panelState()).toBe('default');
  });

  it("replaces other content, calling its owner's onClose, but not when it's reopened", async () => {
    await renderWithNavigation();
    const first = hostFrame('First');
    const second = hostFrame('Second');
    const onClose = vi.fn();
    sidePanel().open(first.element, { onClose });
    await expect.poll(first.loads).toBe(1);

    sidePanel().open(first.element, { onClose });
    expect(onClose).not.toHaveBeenCalled();
    expect(first.loads()).toBe(1);

    sidePanel().open(second.element);

    expect(onClose).toHaveBeenCalledTimes(1);
    await expect.poll(() => panel().element().contains(second.element)).toBe(true);
    expect(first.element.isConnected).toBe(false);
  });

  it('keeps the content against the right edge while it collapses', async () => {
    await renderWithNavigation();
    const frame = hostFrame();
    const handle = sidePanel().open(frame.element, { size: 'full' });
    const contentRight = () => frame.element.getBoundingClientRect().right + CONTENT_PADDING;
    const panelRight = () => panelElement().getBoundingClientRect().right;
    // Once it has slid in
    await expect.poll(panelState).toBe('full');
    await Promise.all(
      (frame.element.parentElement?.getAnimations() ?? []).map((animation) => animation.finished),
    );
    await expect.poll(panelWidth).toBeGreaterThan(800);

    handle?.setSize('default');
    await expect.poll(panelState).toBe('default');

    // Mid-collapse, the panel is still wider than the content it's shrinking to
    expect(panelWidth()).toBeGreaterThan(PANEL_WIDTH);
    expect(contentRight()).toBeCloseTo(panelRight(), 0);
  });

  it.each([false, true])(
    'expands over the page, which keeps its layout: admin7Design %s',
    async (admin7Design) => {
      await renderWithNavigation({ admin7Design });
      const frame = hostFrame();
      const handle = sidePanel().open(frame.element);
      const bezel = admin7Design ? BEZEL : 0;
      await expect.poll(panelWidth).toBe(PANEL_WIDTH + bezel);
      const pageWidth = () => sidebarScreen.shellMain().element().getBoundingClientRect().width;
      const contentWidth = () => frame.element.getBoundingClientRect().width + 2 * CONTENT_PADDING;
      const beside = pageWidth();

      handle?.setSize('full');
      await expect.poll(panelState).toBe('full');

      // Mid-expand, the page is as wide as it was beside the panel, and the
      // content already as wide as the panel is growing to
      expect(pageWidth()).toBeCloseTo(beside, 0);
      expect(panelWidth()).toBeLessThan(800);
      const heldWidth = contentWidth();
      expect(heldWidth).toBeGreaterThan(800);

      // Once expanded, the panel has reached the content's width, and the page hasn't moved
      await expect.poll(() => Math.abs(panelWidth() - bezel - heldWidth)).toBeLessThan(1);
      expect(pageWidth()).toBeCloseTo(beside, 0);

      handle?.setSize('default');
      await expect.poll(panelWidth).toBe(PANEL_WIDTH + bezel);
      expect(pageWidth()).toBeCloseTo(beside, 0);
    },
  );

  it('resizes without reloading, and ignores a stale handle', async () => {
    await renderWithNavigation();
    const frame = hostFrame();
    const handle = sidePanel().open(frame.element);
    await expect.poll(frame.loads).toBe(1);

    handle?.setSize('full');
    await expect.poll(panelState).toBe('full');
    await expect.poll(panelWidth).toBeGreaterThan(PANEL_WIDTH);
    handle?.setSize('default');
    await expect.poll(panelWidth).toBe(PANEL_WIDTH);
    expect(frame.loads()).toBe(1);

    const other = hostFrame('Other');
    const replaced = sidePanel().open(other.element);
    handle?.setSize('full');
    handle?.close();
    // Once the new content renders, so would a size the stale handle set
    await expect.poll(() => panel().element().contains(other.element)).toBe(true);
    expect(panelState()).toBe('default');
    expect(sidePanel().isOpen()).toBe(true);
    expect(replaced).not.toBeNull();
  });

  it.each([
    { width: 2200, panel: 524 },
    { width: 2600, panel: 655 },
  ])(
    'grows into the room beside a full-width page: $width wide',
    async ({ width, panel: expected }) => {
      await renderWithNavigation({ width });
      sidePanel().open(hostFrame().element);

      await expect.poll(panelWidth).toBe(expected);
    },
  );

  it.each([false, true])(
    'floats over the page in the bottom-right corner on a narrower window: admin7Design %s',
    async (admin7Design) => {
      await renderWithNavigation({ admin7Design, width: NARROW_WIDTH });
      const pageWidth = () => sidebarScreen.shellMain().element().getBoundingClientRect().width;
      const before = pageWidth();
      const frame = hostFrame();

      sidePanel().open(frame.element);

      await expect.element(panel()).toBeVisible();
      expect(panelLayout()).toBe('window');
      // Once it has grown out of its corner
      await expect.poll(panelWidth).toBe(WINDOW_WIDTH);
      const box = panelElement().getBoundingClientRect();
      const inset = WINDOW_INSET + (admin7Design ? BEZEL : 0);
      expect(box.height).toBe(WINDOW_HEIGHT);
      expect(box.right).toBeCloseTo(window.innerWidth - inset, 0);
      expect(box.bottom).toBeCloseTo(window.innerHeight - inset, 0);
      expect(frameWidth(frame.element)).toBe(WINDOW_WIDTH - 2 * CONTENT_PADDING);
      expect(pageWidth()).toBe(before);
    },
  );

  it.each([
    { layout: 'window', width: NARROW_WIDTH, isolated: true },
    { layout: 'docked', width: DOCKING_WIDTH, isolated: false },
  ])(
    'isolates the page only while a window floats over it: $layout',
    async ({ width, isolated }) => {
      await renderWithNavigation({ width });
      expect(pageIsolated()).toBe(false);

      sidePanel().open(hostFrame().element);
      await expect.poll(panelState).toBe('default');
      expect(pageIsolated()).toBe(isolated);

      sidePanel().close();
      await expect.poll(panelState).toBe('closed');
      expect(pageIsolated()).toBe(false);
    },
  );

  it('expands the window up and across the page, clear of the navigation', async () => {
    await renderWithNavigation({ width: NARROW_WIDTH });
    const frame = hostFrame();
    const handle = sidePanel().open(frame.element);
    await expect.poll(panelWidth).toBe(WINDOW_WIDTH);

    handle?.setSize('full');

    await expect.poll(panelState).toBe('full');
    const navigationRight = sidebarScreen.shellNav().element().getBoundingClientRect().right;
    await expect
      .poll(() => panelElement().getBoundingClientRect().left)
      .toBeCloseTo(navigationRight + WINDOW_INSET, 0);
    expect(panelElement().getBoundingClientRect().top).toBeCloseTo(WINDOW_INSET, 0);

    handle?.setSize('default');
    await expect.poll(panelWidth).toBe(WINDOW_WIDTH);
    expect(frame.loads()).toBe(1);
  });

  it.each(['default', 'full'] as const)(
    'closes a window at once, keeping its content: %s',
    async (size) => {
      await renderWithNavigation({ width: NARROW_WIDTH });
      const trigger = sidebarScreen.userMenuTrigger();
      trigger.element().focus();
      const frame = hostFrame();
      sidePanel().open(frame.element, { size });
      await expect.poll(frame.loads).toBe(1);
      await expect.poll(() => getComputedStyle(panelElement()).opacity).toBe('1');
      frame.element.focus();
      expect(document.activeElement).toBe(frame.element);

      sidePanel().close();

      await expect.poll(panelState).toBe('closed');
      const style = getComputedStyle(panelElement());
      expect(style.visibility).toBe('hidden');
      expect(style.opacity).toBe('0');
      expect(style.transitionProperty).toBe('none');
      expect(document.activeElement).toBe(trigger.element());
      expect(frame.element.isConnected).toBe(true);

      sidePanel().open(frame.element);
      await expect.element(panel()).toBeVisible();
      expect(frame.loads()).toBe(1);
    },
  );

  it('keeps its content as the window crosses the docking width', async () => {
    await renderWithNavigation({ width: NARROW_WIDTH });
    const frame = hostFrame();
    sidePanel().open(frame.element);
    await expect.poll(frame.loads).toBe(1);
    expect(panelLayout()).toBe('window');

    await page.viewport(DOCKING_WIDTH, 800);
    await expect.poll(panelLayout).toBe('docked');
    await expect.poll(panelWidth).toBe(PANEL_WIDTH);
    await page.viewport(NARROW_WIDTH, 800);
    await expect.poll(panelLayout).toBe('window');

    expect(panel().element().contains(frame.element)).toBe(true);
    expect(frame.loads()).toBe(1);
    expect(sidePanel().isOpen()).toBe(true);
  });

  it('hides on a route without the navigation and shows again on return', async () => {
    fakeEditorChrome();
    fakeEditorPost();
    await renderWithNavigation();
    const frame = hostFrame();
    const onClose = vi.fn();
    sidePanel().open(frame.element, { onClose });
    await expect.poll(frame.loads).toBe(1);

    window.location.hash = '#/editor/post/abc123';
    await expect.poll(currentRoute).toBe('/editor/post/abc123');
    await expect.poll(panelState).toBe('closed');
    // Gone at once, not animated away: the editor opens at its full width
    expect(panelWidth()).toBe(0);
    expect(sidePanel().isOpen()).toBe(true);
    expect(sidePanel().open(hostFrame('Other').element)).toBeNull();

    window.history.back();
    await expect.poll(panelState).toBe('default');
    // Back at once too
    expect(panelWidth()).toBe(PANEL_WIDTH);
    expect(panel().element().contains(frame.element)).toBe(true);
    expect(frame.loads()).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays open in Settings, which has a navigation of its own, and on return', async () => {
    // The settings app owns its request graph; this spec asserts only the panel.
    allowUnhandledRequests();
    await renderWithNavigation();
    const frame = hostFrame();
    const onClose = vi.fn();
    sidePanel().open(frame.element, { onClose });
    await expect.poll(frame.loads).toBe(1);

    await sidebarScreen.navLink('Settings').click();
    await expect.poll(currentRoute).toMatch(/^\/settings/);
    const backToApp = sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' });
    await expect.element(backToApp).toBeVisible();
    expect(panelState()).toBe('default');
    expect(panel().element().contains(frame.element)).toBe(true);

    await backToApp.click();
    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    expect(panelState()).toBe('default');
    expect(panel().element().contains(frame.element)).toBe(true);
    expect(frame.loads()).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays in Settings for editors, who keep the main navigation there', async () => {
    // The settings app owns its request graph; this spec asserts only the panel.
    allowUnhandledRequests();
    fakeTags([]);
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];
    await renderAdminApp('/tags', { boot: { browseMe: { response: me } } });
    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    sidePanel().open(hostFrame().element);
    await expect.poll(panelState).toBe('default');

    window.location.hash = '#/settings/staff';
    await expect.poll(currentRoute).toMatch(/^\/settings\/staff/);

    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    expect(panelState()).toBe('default');
  });

  it('returns null for contributors, who have no navigation', async () => {
    fakePostsListScreen();
    fakePosts([]);
    await renderAdminApp('/posts', asContributor());
    await expect.element(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();

    expect(sidePanel().open(hostFrame().element)).toBeNull();
  });

  it('returns null on mobile', async () => {
    await page.viewport(390, 844);
    fakeTags([]);
    await renderAdminApp('/tags');
    await expect.element(page.getByRole('button', { name: 'Toggle Sidebar' })).toBeVisible();

    expect(sidePanel().open(hostFrame().element)).toBeNull();
  });
});
