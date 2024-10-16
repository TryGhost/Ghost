import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, mockSitePreview, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Portal Settings', async () => {
    test('Loads Portal Preview Modal', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await mockSitePreview({
            page,
            url: 'http://localhost:2368/?v=modal-portal-settings#/portal/preview?button=true&name=true&isFree=true&isMonthly=true&isYearly=true&page=signup&buttonIcon=icon-1&signupButtonText=Subscribe&membersSignupAccess=all&allowSelfSignup=true&signupTermsHtml=&signupCheckboxRequired=false&portalProducts=6511005e14c14a231e49af15&portalPrices=free%252Cmonthly%252Cyearly&accentColor=%2523FF1A75&buttonStyle=icon-and-text&disableBackground=false',
            response: '<html><head><style></style></head><body><div>PortalPreview</div></body></html>'
        });

        await page.goto('/');
        const section = await page.getByTestId('portal');
        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="portal-modal"]');
    });

    test('can toggle portal signup options', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            tiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            // the tiers id is from the responseFixtures.tiers, free tier id
            editTiers: {method: 'PUT', path: '/tiers/645453f4d254799990dd0e21/', response: responseFixtures.tiers}
        }});

        await mockSitePreview({
            page,
            url: 'http://localhost:2368/?v=modal-portal-settings#/portal/preview?button=true&name=true&isFree=true&isMonthly=true&isYearly=true&page=signup&buttonIcon=icon-1&signupButtonText=Subscribe&membersSignupAccess=all&allowSelfSignup=true&signupTermsHtml=&signupCheckboxRequired=false&portalProducts=6511005e14c14a231e49af15&portalPrices=free%252Cmonthly%252Cyearly&accentColor=%2523FF1A75&buttonStyle=icon-and-text&disableBackground=false',
            response: '<html><head><style></style></head><body><div>PortalPreview</div></body></html>'
        });

        await page.goto('/');
        const section = await page.getByTestId('portal');
        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="portal-modal"]');

        const modal = await page.getByTestId('portal-modal');

        await modal.getByRole('switch').click();
        await modal.getByRole('checkbox').click();
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editTiers?.body).toMatchObject({
            tiers: [{
                name: 'Free',
                visibility: 'none'
            }]
        });
    });

    test('can toggle portal Look & Feel options', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await mockSitePreview({
            page,
            url: 'http://localhost:2368/?v=modal-portal-settings#/portal/preview?button=true&name=true&isFree=true&isMonthly=true&isYearly=true&page=signup&buttonIcon=icon-1&signupButtonText=Subscribe&membersSignupAccess=all&allowSelfSignup=true&signupTermsHtml=&signupCheckboxRequired=false&portalProducts=6511005e14c14a231e49af15&portalPrices=free%252Cmonthly%252Cyearly&accentColor=%2523FF1A75&buttonStyle=icon-and-text&disableBackground=false',
            response: '<html><head><style></style></head><body><div>PortalPreview</div></body></html>'
        });

        await page.goto('/');
        const section = await page.getByTestId('portal');
        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="portal-modal"]');

        const modal = await page.getByTestId('portal-modal');

        await modal.getByRole('tab', {name: 'Look & feel'}).click();

        await modal.getByRole('switch').click();
        await modal.getByRole('textbox').fill('become a member of something epic');
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'portal_button', value: false},
                {
                    key: 'portal_button_signup_text',
                    value: 'become a member of something epic'
                }
            ]
        });
    });

    test('can toggle portal account options', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await mockSitePreview({
            page,
            url: 'http://localhost:2368/?v=modal-portal-settings#/portal/preview?button=true&name=true&isFree=true&isMonthly=true&isYearly=true&page=signup&buttonIcon=icon-1&signupButtonText=Subscribe&membersSignupAccess=all&allowSelfSignup=true&signupTermsHtml=&signupCheckboxRequired=false&portalProducts=6511005e14c14a231e49af15&portalPrices=free%252Cmonthly%252Cyearly&accentColor=%2523FF1A75&buttonStyle=icon-and-text&disableBackground=false',
            response: '<html><head><style></style></head><body><div>PortalPreview</div></body></html>'
        });

        await page.goto('/');
        const section = await page.getByTestId('portal');
        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="portal-modal"]');

        const modal = page.getByTestId('portal-modal');

        // since account page occurs twice on the page, we need to grab it by ID instead.
        const accountTab = await page.$('#accountPage');
        await accountTab?.click();
        await modal.getByRole('textbox').fill('hello@world.com');
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {
                    key: 'members_support_address',
                    value: 'hello@world.com'
                }
            ]
        });
    });
});
