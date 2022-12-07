const {expect, test} = require('@playwright/test');

/**
 * Start a post draft with a filled in title and body. We can consider to move this to utils later.
 * @param {import('@playwright/test').Page} page
 */
const createPost = async (page) => {
    await page.locator('.gh-nav a[href="#/posts/"]').click();

    // Create a new post
    await page.locator('[data-test-new-post-button]').click();

    // Fill in the post title
    await page.locator('[data-test-editor-title-input]').click();
    await page.locator('[data-test-editor-title-input]').fill('Hello world');

    // Continue to the body by pressing enter
    await page.keyboard.press('Enter');

    // We need to check focused because otherwise it will start typing too soon and we'll lose a part of the text
    await expect(page.locator('.koenig-editor [contenteditable="true"]')).toBeFocused();
    await page.keyboard.type('This is my post body.');
};

/**
 * @param {import('@playwright/test').Page} page
 */
const openPublishFlow = async (page) => {
    await page.locator('[data-test-button="publish-flow"]').click();
};

test.describe('Publishing', () => {
    test.describe('Publish post', () => {
        test('Post should only be available on web', async ({page}) => {
            await page.goto('/ghost');
            await createPost(page);

            // Publish the post
            await openPublishFlow(page);

            // Check if publish only
            await page.locator('[data-test-setting="publish-type"] > button').click();

            // We can choose publish, publish+send or send here, but we need 'publish' only here.
            await page.locator('[data-test-publish-type="publish"]').setChecked(true);

            // Continue
            await page.locator('[data-test-button="continue"]').click();

            // Confirm publishing
            // (we need force because the button is animating)
            await page.locator('[data-test-button="confirm-publish"]').click({force: true});

            // Open the published post in a new tab
            const [page1] = await Promise.all([
                page.waitForEvent('popup'),
                page.locator('[data-test-complete-bookmark]').click()
            ]);

            // Check if 'This is my post body.' is present on page1
            await expect(page1.locator('.gh-canvas .article-title')).toHaveText('Hello world');
            await expect(page1.locator('.gh-content.gh-canvas > p')).toHaveText('This is my post body.');
        });
    });
});
