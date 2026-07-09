import {AutomationsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Automations', () => {
    // Automations ships behind a Beta feature flag; enable it for these tests.
    test.use({labs: {automations: true}});

    test('renders the automations page', async ({page}) => {
        const automationsPage = new AutomationsPage(page);
        await automationsPage.goto();
        await automationsPage.waitForPageToFullyLoad();

        await expect(automationsPage.pageContent).toBeVisible();
        await expect(automationsPage.title('Automations')).toBeVisible();
    });

    test('lists the default welcome automations', async ({page}) => {
        const automationsPage = new AutomationsPage(page);
        await automationsPage.goto();
        await automationsPage.waitForPageToFullyLoad();

        await expect(automationsPage.automationsList).toBeVisible();
        expect(await automationsPage.automationListRow.count()).toBeGreaterThan(0);
    });
});
