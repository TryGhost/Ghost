import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import hostHtml from '../index.html?raw';

import { currentUserResponse, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { sidebarScreen } from '@/layout/sidebar.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

const bootLoader = () => page.getByRole('status', { name: 'Loading Ghost Admin' });
const bootError = () => page.getByRole('alert');

/** Boots with `GET /users/me/` held until the spec releases it. */
function holdCurrentUser() {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const browseMe = {
    response: async () => {
      await released;
      return currentUserResponse();
    },
  };
  return { boot: { browseMe }, release };
}

describe('Admin boot', () => {
  beforeEach(() => {
    vi.mocked(reloadAdmin).mockClear();
  });

  it('shows its own loader until the signed-in user loads', async () => {
    fakeTags([]);
    const me = holdCurrentUser();
    await renderAdminApp('/tags', { boot: me.boot });

    await expect.element(bootLoader()).toBeVisible();

    me.release();

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect(bootLoader()).toHaveCount(0);
  });

  it('shows why the signed-in user could not be read, and reloads on retry', async () => {
    await renderAdminApp('/tags?tab=internal', {
      boot: {
        browseMe: {
          response: {
            errors: [
              {
                type: 'InternalServerError',
                message: 'An unexpected error occurred, please try again.',
                context: 'The database is unavailable.',
              },
            ],
          },
          responseStatus: 500,
        },
      },
    });

    await expect.element(bootError()).toHaveTextContent('The database is unavailable.');
    await expect(bootLoader()).toHaveCount(0);

    await bootError().getByRole('button', { name: 'Retry' }).click();

    expect(vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags?tab=internal']]);
  });
});

function expectCentered(video: Element, width: number, height: number) {
  const rect = video.getBoundingClientRect();
  expect(rect.width).toBe(100);
  expect(rect.height).toBe(100);
  expect(rect.x + rect.width / 2).toBeCloseTo(width / 2, 0);
  expect(rect.y + rect.height / 2).toBeCloseTo(height / 2, 0);
}

it.each([
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
])(
  'keeps the boot animation centered through startup at $width × $height',
  async ({ width, height }) => {
    await page.viewport(width, height);
    const host = new DOMParser().parseFromString(hostHtml, 'text/html');
    // Measure the actual host markup in an isolated document with no app CSS or JS.
    // The animation's media and icons are unnecessary for checking its layout.
    host.querySelectorAll('script, link, source').forEach((element) => element.remove());
    const frame = document.createElement('iframe');
    frame.style.cssText = `position: fixed; inset: 0; width: ${width}px; height: ${height}px; border: 0;`;
    const loaded = new Promise<void>((resolve) => {
      frame.onload = () => resolve();
    });
    frame.srcdoc = host.documentElement.outerHTML;
    document.body.appendChild(frame);

    const criticalStyle = host.querySelector('style')!.cloneNode(true) as HTMLStyleElement;
    const splash = host.getElementById('boot-splash')!.cloneNode(true) as HTMLElement;
    const me = holdCurrentUser();

    try {
      await loaded;
      expectCentered(frame.contentDocument!.querySelector('video')!, width, height);
      frame.remove();

      // The main test document has the app stylesheet, but React has not mounted.
      document.head.appendChild(criticalStyle);
      document.body.classList.add('react-admin');
      document.body.appendChild(splash);
      expect(getComputedStyle(splash).display).toBe('flex');
      expectCentered(splash.querySelector('video')!, width, height);

      await renderAdminApp('/site', {
        boot: me.boot,
      });
      const loader = page.getByRole('status', { name: 'Loading Ghost Admin' });
      await expect.element(loader).toBeVisible();
      expect(getComputedStyle(splash).display).toBe('none');
      expectCentered(loader.element().querySelector('video')!, width, height);

      me.release();
      await expect.element(sidebarScreen.shellMain()).toBeVisible();
      await expect.element(loader).not.toBeInTheDocument();
      expect(getComputedStyle(splash).display).toBe('none');
    } finally {
      me.release();
      frame.remove();
      criticalStyle.remove();
      splash.remove();
      await page.viewport(1280, 800);
    }
  },
);
