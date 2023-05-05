const {expect, test} = require('@playwright/test');

test.describe('Announcement Bar Settings', () => {
    test('Bar hidden by default', async ({page}) => {
        await page.goto('/ghost');
        await goToAnnouncementBarSettings(page);

        await test.step('Bar should be hidden', async () => {
            const htmlFrame = await getPreviewFrame(page);
            await expect(await htmlFrame.locator('#announcement-bar-root')).toHaveCount(0);
        });
    });

    test('Show/hide bar if visibility checked/unchecked and text filled', async ({page}) => {
        await page.goto('/ghost');
        await goToAnnouncementBarSettings(page);

        await test.step('Check free members', async () => {
            const freeMembersCheckbox = await page.getByTestId('announcement-bar-free-member-input');
            await expect(await freeMembersCheckbox.isChecked()).toBeFalsy();
            await page.getByTestId('announcement-bar-free-member-label').click();
            await expect(await freeMembersCheckbox.isChecked()).toBeTruthy();
        });

        await test.step('Fill announcement text', async () => {
            await page.locator('.koenig-react-editor').click();
            await expect(await page.locator('[contenteditable="true"]')).toBeVisible({timeout: 30000}); // add timeout as lexical module loading can take time
            await page.keyboard.type('Announcement text');
            await page.getByTestId('announcement-bar-title').click();
        });

        const htmlFrame = await getPreviewFrame(page);
        await test.step('Announcement bar should be visible', async () => {
            await expect(await htmlFrame.getByText('Announcement text')).toBeVisible();
        });

        await test.step('Disable free members', async () => {
            const freeMembersCheckbox = await page.getByTestId('announcement-bar-free-member-input');
            await expect(await freeMembersCheckbox.isChecked()).toBeTruthy();
            await page.getByTestId('announcement-bar-free-member-label').click();
            await expect(await freeMembersCheckbox.isChecked()).toBeFalsy();
            await page.locator('.koenig-react-editor').click();
        });

        await test.step('Announcement bar should be hidden', async () => {
            await expect(await htmlFrame.getByText('Announcement text')).toBeHidden();
        });
    });
});

async function goToAnnouncementBarSettings(page) {
    return await test.step('Navigate to the announcement bar settings', async () => {
        await page.locator('[data-test-nav="settings"]').click();
        await page.locator('[data-test-nav="announcement-bar"]').click();
        await expect(await page.getByTestId('announcement-bar-title')).toBeVisible();
    });
}

async function getPreviewFrame(page) {
    return page.frameLocator('[data-testid="iframe-html"]:visible');
}
