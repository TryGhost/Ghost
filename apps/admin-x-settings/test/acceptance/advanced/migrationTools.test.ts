import {expect, test} from '@playwright/test';
import {expectExternalNavigate, mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {globalDataRequests} from '../../utils/acceptance';

test.describe('Migration tools', async () => {
    test('Built-in migrators', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const migrationSection = page.getByTestId('migrationtools');

        await migrationSection.getByRole('button', {name: 'Substack'}).click();
        await expectExternalNavigate(page, {route: '/migrate/substack'});

        await page.goto('/');

        await migrationSection.getByRole('button', {name: 'Medium'}).click();
        await expectExternalNavigate(page, {route: '/migrate/medium'});

        await page.goto('/');

        await migrationSection.getByRole('button', {name: 'Mailchimp'}).click();
        await expectExternalNavigate(page, {route: '/migrate/mailchimp'});
    });

    // test('Universal import', async ({page}) => {
    //     const {lastApiRequests} = await mockApi({page, requests: {
    //         ...globalDataRequests,
    //         importContent: {path: '/db/', method: 'POST', response: {}}
    //     }});

    //     await page.goto('/');

    //     const migrationSection = page.getByTestId('migrationtools');

    //     await migrationSection.getByRole('button', {name: 'Universal import'}).click();

    //     const universalImportModal = page.getByTestId('universal-import-modal');

    //     const fileChooserPromise = page.waitForEvent('filechooser');

    //     universalImportModal.getByText(/JSON or zip file/).click();

    //     const fileChooser = await fileChooserPromise;
    //     await fileChooser.setFiles(`${__dirname}/../../utils/files/upload.zip`);

    //     const confirmationModal = page.getByTestId('confirmation-modal');

    //     await expect(confirmationModal).toContainText('Import in progress');

    //     await confirmationModal.getByRole('button', {name: 'Got it'}).click();

    //     await expect(universalImportModal).not.toBeVisible();
    //     await expect(confirmationModal).not.toBeVisible();

    //     expect(lastApiRequests.importContent).toBeTruthy();
    // });

    test('Content export', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            downloadAllContent: {path: '/db/', method: 'GET', response: {}}
        }});

        await page.goto('/');

        const migrationSection = page.getByTestId('migrationtools');

        await migrationSection.getByRole('tab', {name: 'Export'}).click();

        await migrationSection.getByRole('button', {name: 'Export content'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/db\/$/);

        expect(lastApiRequests.downloadAllContent).toBeTruthy();
    });
});
