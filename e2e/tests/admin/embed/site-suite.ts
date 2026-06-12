import {SitePage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

/**
 * Site screen smoke tests, shared between the Ember implementation (labs flag
 * `embedScreensX` off) and the React implementation (flag on). The screen
 * frames the front-end site, which is external to the admin, so the suite
 * only asserts the iframe element and its src construction.
 */
export function defineSiteTests() {
    test('renders the site iframe with admin preview params', async ({page}) => {
        const sitePage = new SitePage(page);
        await sitePage.goto();

        await expect(sitePage.siteFrame).toBeVisible();

        const src = await sitePage.siteFrame.getAttribute('src');
        const srcUrl = new URL(src ?? '');

        // admin=1 marks the request as coming from the admin, admin_toolbar=0
        // hides the front-end toolbar, v=<guid> forces a reload per navigation
        expect(srcUrl.searchParams.get('admin')).toBe('1');
        expect(srcUrl.searchParams.get('admin_toolbar')).toBe('0');
        expect(srcUrl.searchParams.get('v')).toBeTruthy();
    });
}
