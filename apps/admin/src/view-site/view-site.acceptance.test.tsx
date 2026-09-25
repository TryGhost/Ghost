import { describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import { fakeFrameOrigin, renderAdminApp, siteResponse } from '@test-utils/acceptance';

const SITE_URL = String(siteResponse().site.url);
const SITE_ORIGIN = new URL(SITE_URL).origin;

// Reports each page the frame loads, since the test cannot read a
// cross-origin frame's location.
const siteStandIn = `<!doctype html><script>
  parent.postMessage({ siteFrameLoaded: location.href }, '*');
</script>`;

function loadedSitePages(): string[] {
  const pages: string[] = [];
  const listener = (event: MessageEvent<{ siteFrameLoaded?: string } | null>) => {
    if (event.origin === SITE_ORIGIN && event.data?.siteFrameLoaded) {
      pages.push(event.data.siteFrameLoaded);
    }
  };
  window.addEventListener('message', listener);
  onTestFinished(() => window.removeEventListener('message', listener));
  return pages;
}

const siteFrame = () => page.getByTitle('Site preview');

describe('View site', () => {
  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    await renderAdminApp('/site', {
      labs: enabled === undefined ? {} : { iframeRoutesReact: enabled },
    });

    // There is no Ember runtime in this tier; the shell exposes its host
    // instead.
    await expect
      .poll(() => document.getElementById('ember-app')?.parentElement?.hidden)
      .toBe(false);
    await expect.element(siteFrame()).not.toBeInTheDocument();
  });

  it('shows the site homepage without the admin toolbar', async () => {
    await fakeFrameOrigin(SITE_ORIGIN, siteStandIn);
    const pages = loadedSitePages();
    await renderAdminApp('/site', { labs: { iframeRoutesReact: true } });

    await expect.poll(() => pages.length).toBe(1);
    const loaded = new URL(pages[0]);
    expect(loaded.origin + loaded.pathname).toBe(SITE_URL);
    expect(loaded.searchParams.get('admin')).toBe('1');
    expect(loaded.searchParams.get('admin_toolbar')).toBe('0');
    expect(loaded.searchParams.get('v')).toMatch(/^\d+$/);
  });

  it('returns to the homepage when View site is clicked again', async () => {
    await fakeFrameOrigin(SITE_ORIGIN, siteStandIn);
    const pages = loadedSitePages();
    await renderAdminApp('/site', { labs: { iframeRoutesReact: true } });
    await expect.poll(() => pages.length).toBe(1);

    const frame = siteFrame().element() as HTMLIFrameElement;
    frame.contentWindow?.location.replace(`${SITE_ORIGIN}/about/`);
    await expect.poll(() => pages.at(-1)).toBe(`${SITE_ORIGIN}/about/`);

    await page.getByRole('link', { name: 'View site', exact: true }).click();

    await expect.poll(() => pages.length).toBe(3);
    expect(new URL(pages[2]).pathname).toBe('/');
  });
});
