const {expect, test} = require('@playwright/test');

/**
 * Start a post draft with a filled in title and body. We can consider to move this to utils later.
 * @param {import('@playwright/test').Page} page
 */
const createPost = async (page, {title = 'Hello world', body = 'This is my post body.'} = {}) => {
    await page.locator('.gh-nav a[href="#/posts/"]').click();

    // Create a new post
    await page.locator('[data-test-new-post-button]').click();

    // Fill in the post title
    await page.locator('[data-test-editor-title-input]').click();
    await page.locator('[data-test-editor-title-input]').fill(title);

    // Continue to the body by pressing enter
    await page.keyboard.press('Enter');

    // We need to check focused because otherwise it will start typing too soon and we'll lose a part of the text
    await expect(page.locator('[data-kg="editor"]')).toBeFocused();
    await page.keyboard.type(body);
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

    test.describe('Update post', () => {
        test('Can update a published post', async ({page: adminPage, browser}) => {
            await adminPage.goto('/ghost');

            // create post
            await createPost(adminPage, {title: 'Testing publish update', body: 'This is the initial published text.'});

            // publish the post
            await adminPage.locator('[data-test-button="publish-flow"]').click();
            await adminPage.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]').click();
            await adminPage.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]').click({force: true});
            await adminPage.locator('[data-test-modal="publish-flow"] [data-test-button="back-to-editor"]').click();

            // set up another tab with the front-end
            const frontPage = await browser.newPage();
            await frontPage.goto('http://127.0.0.1:2369/testing-publish-update/');
            const frontBody = frontPage.getByRole('main');

            // check front-end post has the initial body text
            await expect(frontBody).toContainText('This is the initial published text.');

            // add some extra text to the post
            await adminPage.locator('[data-kg="editor"]').click();
            await adminPage.keyboard.press('Enter');
            await adminPage.keyboard.type('This is some updated text.');

            // save
            await adminPage.locator('[data-test-button="publish-save"]').click();

            // check front-end has new text after reloading
            await frontPage.waitForTimeout(100); // let save go through
            await frontPage.reload();
            await expect(frontBody).toContainText('This is some updated text.');
        });
    });
});
