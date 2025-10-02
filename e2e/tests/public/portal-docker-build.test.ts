import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';

test.describe('Ghost Public - Portal Docker Build Verification', () => {
    test('portal loads with docker build changes - data attribute present', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.openPortalViaSubscribeButton();

        const portalRoot = page.locator('#ghost-portal-root');
        await expect(portalRoot).toBeVisible();
        await expect(portalRoot).toHaveAttribute('data-portal-docker-test', 'true');
    });
});
