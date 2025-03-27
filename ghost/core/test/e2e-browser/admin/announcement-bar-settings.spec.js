const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Announcement Bar Settings', () => {
    test('Bar hidden by default', async ({sharedPage}) => {
        await sharedPage.goto('/ghost');
        await goToAnnouncementBarSettings(sharedPage);

        await test.step('Bar should be hidden', async () => {
            const htmlFrame = getPreviewFrame(sharedPage);
            await expect(await htmlFrame.locator('#announcement-bar-root')).toHaveCount(0);
        });
    });

    test('Show/hide bar if visibility checked/unchecked and text filled', async ({sharedPage}) => {
        await sharedPage.goto('/ghost');
        const modal = await goToAnnouncementBarSettings(sharedPage);

        await test.step('Check free members', async () => {
            const freeMembersCheckbox = modal.getByLabel('Free members');
            await expect(freeMembersCheckbox).not.toBeChecked();
            await freeMembersCheckbox.check();
        });

        await test.step('Fill announcement text', async () => {
            await modal.locator('.koenig-react-editor').click();
            await expect(await modal.locator('[contenteditable="true"]')).toBeVisible({timeout: 30000}); // add timeout as lexical module loading can take time
            await sharedPage.keyboard.type('Announcement text');
            await modal.getByText('Announcement').first().click(); // defocus the editor
        });

        const htmlFrame = getPreviewFrame(sharedPage);
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

async function goToAnnouncementBarSettings(sharedPage) {
    await test.step('Navigate to the announcement bar settings', async () => {
        await sharedPage.locator('[data-test-nav="settings"]').click();
        await sharedPage.getByTestId('announcement-bar').getByRole('button', {name: 'Customize'}).click();
        // Wait for the preview to load
        await getPreviewFrame(sharedPage).locator('body *:visible').first().waitFor();
    });
    return sharedPage.getByTestId('announcement-bar-modal');
}

function getPreviewFrame(sharedPage) {
    return sharedPage.frameLocator('[data-testid="announcement-bar-preview-iframe"] > iframe[data-visible=true]');
}
