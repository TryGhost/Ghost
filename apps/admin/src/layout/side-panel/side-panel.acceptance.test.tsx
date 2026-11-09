import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
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
const panelWidth = () =>
  document.querySelector('[data-side-panel]')?.getBoundingClientRect().width ?? 0;

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

/** Renders Tags with the navigation, in either design. */
async function renderWithNavigation({ admin7Design = false } = {}) {
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

function asContributor(): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { boot: { browseMe: { response: me } } };
}

describe('Side panel', () => {
  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  it.each([false, true])(
    'shows opened content beside the page: admin7Design %s',
    async (admin7Design) => {
      await renderWithNavigation({ admin7Design });
      const frame = hostFrame();

      expect(sidePanel().open(frame.element)).not.toBeNull();

      await expect.element(panel()).toBeVisible();
      expect(panel().element().contains(frame.element)).toBe(true);
      await expect.poll(panelWidth).toBe(380);
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
    },
    { how: 'Escape', close: () => userEvent.keyboard('{Escape}') },
  ])('hides with $how, keeps the content and returns focus', async ({ close }) => {
    await renderWithNavigation();
    const trigger = sidebarScreen.userMenuTrigger();
    trigger.element().focus();
    const frame = hostFrame();
    const onClose = vi.fn();
    sidePanel().open(frame.element, { onClose });
    await expect.element(panel()).toBeVisible();

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
    await expect.poll(panelWidth).toBeGreaterThan(800);

    handle?.setSize('default');
    await expect.poll(panelState).toBe('default');

    // Mid-collapse, the panel is still wider than the content it's shrinking to
    expect(panelWidth()).toBeGreaterThan(380);
    const contentRight = frame.element.getBoundingClientRect().right;
    expect(contentRight).toBeCloseTo(panelElement().getBoundingClientRect().right, 0);
  });

  it('resizes without reloading, and ignores a stale handle', async () => {
    await renderWithNavigation();
    const frame = hostFrame();
    const handle = sidePanel().open(frame.element);
    await expect.poll(frame.loads).toBe(1);

    handle?.setSize('full');
    await expect.poll(panelState).toBe('full');
    await expect.poll(panelWidth).toBeGreaterThan(380);
    handle?.setSize('default');
    await expect.poll(panelWidth).toBe(380);
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
    expect(sidePanel().isOpen()).toBe(true);
    expect(sidePanel().open(hostFrame('Other').element)).toBeNull();

    window.history.back();
    await expect.poll(panelState).toBe('default');
    expect(panel().element().contains(frame.element)).toBe(true);
    expect(frame.loads()).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
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
