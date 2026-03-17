const test = require('../fixtures/ghost-test');

test.describe('Portal Settings', () => {
    test.describe('Links', () => {
        const openPortalLinks = async (sharedPage) => {
            await sharedPage.goto('/ghost');
            await sharedPage.getByRole('navigation').getByRole('link', {name: 'Settings'}).click();

            await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const modal = sharedPage.getByTestId('portal-modal');

            await modal.getByRole('tab', {name: 'Links'}).click();

            return modal;
        };

        test('can open portal directly on monthly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch and go to portal directly monthly signup url
            const portalUrl = await modal.getByLabel('Signup / Monthly').inputValue();
            await sharedPage.goto(portalUrl);

            // expect stripe checkout to have opeened
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/);
        });

        test('can open portal directly on yearly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch and go to portal directly yearly signup url
            const portalUrl = await modal.getByLabel('Signup / Yearly').inputValue();
            await sharedPage.goto(portalUrl);

            // expect stripe checkout to have opeened
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/);
        });
    });
});
