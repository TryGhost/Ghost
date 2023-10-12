const {expect, test} = require('@playwright/test');

test.describe('Announcement Bar Settings', () => {
    test('Bar hidden by default', async ({page}) => {
        await page.goto('/ghost');
        await goToAnnouncementBarSettings(page);

        await test.step('Bar should be hidden', async () => {
            const htmlFrame = getPreviewFrame(page);
            await expect(await htmlFrame.locator('#announcement-bar-root')).toHaveCount(0);
        });
    });

    test('Show/hide bar if visibility checked/unchecked and text filled', async ({page}) => {
        await page.goto('/ghost');
        const modal = await goToAnnouncementBarSettings(page);

        await test.step('Check free members', async () => {
            const freeMembersCheckbox = modal.getByLabel('Free members');
            await expect(freeMembersCheckbox).not.toBeChecked();
            await freeMembersCheckbox.check();
        });

        await test.step('Fill announcement text', async () => {
            await modal.locator('.koenig-react-editor').click();
            await expect(await modal.locator('[contenteditable="true"]')).toBeVisible({timeout: 30000}); // add timeout as lexical module loading can take time
            await page.keyboard.type('Announcement text');
            await modal.getByText('Announcement').first().click(); // defocus the editor
        });

        const htmlFrame = getPreviewFrame(page);
        await test.step('Announcement bar should be visible', async () => {
            await expect(await htmlFrame.getByText('Announcement text')).toBeVisible();
        });

        await test.step('Disable free members', async () => {
            const freeMembersCheckbox = modal.getByLabel('Free members');
            await expect(freeMembersCheckbox).toBeChecked();
            await freeMembersCheckbox.uncheck();
            await modal.locator('.koenig-react-editor').click();
        });

        await test.step('Announcement bar should be hidden', async () => {
            await expect(await htmlFrame.getByText('Announcement text')).toBeHidden();
        });
    });
});

async function goToAnnouncementBarSettings(page) {
    await test.step('Navigate to the announcement bar settings', async () => {
        await page.locator('[data-test-nav="settings"]').click();
        await page.getByTestId('announcement-bar').getByRole('button', {name: 'Customize'}).click();
        // Wait for the preview to load
        await getPreviewFrame(page).locator('body *:visible').first().waitFor();
    });
    return page.getByTestId('announcement-bar-modal');
}

function getPreviewFrame(page) {
    return page.frameLocator('[data-testid="announcement-bar-preview-iframe"] > iframe[data-visible=true]');
}
