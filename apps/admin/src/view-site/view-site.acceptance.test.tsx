import { describe, expect, it, onTestFinished } from 'vitest';
import {
  emberScreenShown,
  fakeFrameOrigin,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { viewSiteScreen } from './view-site.screen';

const SITE_URL = String(siteResponse().site.url);
const SITE_ORIGIN = new URL(SITE_URL).origin;

// Reports each page the frame loads; a cross-origin frame's location is unreadable.
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

describe('View site', () => {
  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    await renderAdminApp('/site', {
      labs: enabled === undefined ? {} : { iframeRoutesReact: enabled },
    });

    await expect.poll(emberScreenShown).toBe(true);
    await expect.element(viewSiteScreen.frame()).not.toBeInTheDocument();
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
    expect(emberScreenShown()).toBe(false);
  });

  it('returns to the homepage when View site is clicked again', async () => {
    await fakeFrameOrigin(SITE_ORIGIN, siteStandIn);
    const pages = loadedSitePages();
    await renderAdminApp('/site', { labs: { iframeRoutesReact: true } });
    await expect.poll(() => pages.length).toBe(1);

    const frame = viewSiteScreen.frame().element() as HTMLIFrameElement;
    frame.contentWindow?.location.replace(`${SITE_ORIGIN}/about/`);
    await expect.poll(() => pages.at(-1)).toBe(`${SITE_ORIGIN}/about/`);

    await viewSiteScreen.navLink().click();

    await expect.poll(() => pages.length).toBe(3);
    expect(new URL(pages[2]).pathname).toBe('/');
  });
});
