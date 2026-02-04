import {expect, test} from '@playwright/test';
import {expectExternalNavigate, globalDataRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Migration tools', async () => {
    test('Built-in migrators', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        const openMigrator = async (name: string, route: string) => {
            await page.goto('/');

            const migrationSection = page.getByTestId('migrationtools');
            await expect(migrationSection).toBeVisible();

            await migrationSection.getByRole('button', {name}).click();
            await expectExternalNavigate(page, {route});
        };

        await openMigrator('Substack', '/migrate/substack');
        await openMigrator('WordPress', '/migrate/wordpress');
        await openMigrator('Medium', '/migrate/medium');
        await openMigrator('Mailchimp', '/migrate/mailchimp');
    });

    // test('Universal import', async ({page}) => {
    //     const {lastApiRequests} = await mockApi({page, requests: {
    //         ...globalDataRequests,
    //         importContent: {path: '/db/', method: 'POST', response: {}}
    //     }});

    //     await page.goto('/');

    //     const migrationSection = page.getByTestId('migration-tools');

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
        await expect(migrationSection).toBeVisible();

        await migrationSection.getByRole('tab', {name: 'Export'}).click();

        await migrationSection.getByRole('button', {name: 'Content & settings'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/db\/$/);

        await expect.poll(() => lastApiRequests.downloadAllContent).toBeTruthy();
    });
});
