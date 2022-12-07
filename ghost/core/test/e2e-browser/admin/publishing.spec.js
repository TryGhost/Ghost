const {expect, test} = require('@playwright/test');

/**
 * Start a post draft with a filled in title and body. We can consider to move this to utils later.
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.title]
 * @param {String} [options.body]
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

    await page.waitForTimeout(100); // allow new->draft switch to occur fully, without this some initial typing events can be missed
    await page.keyboard.type(body);
};

/**
 * @param {import('@playwright/test').Page} page
 */
const openPublishFlow = async (page) => {
    await page.locator('[data-test-button="publish-flow"]').click();
};

/**
 * @param {import('@playwright/test').Page} page
 */
const closePublishFlow = async (page) => {
    await page.locator('[data-test-button="close-publish-flow"]').click();
};

/**
 * @typedef {Object} PublishOptions
 * @property {'publish'|'publish+send'|'send'} [type]
 * @property {String} [recipientFilter]
 * @property {String} [newsletter]
 * @property {String} [date]
 * @property {String} [time]
 */

/**
 * Open and complete publish flow, filling in all necessary fields based on publish options
 * @param {import('@playwright/test').Page} page
 * @param {PublishOptions} options
 */
const publishPost = async (page, {type = 'publish', time} = {}) => {
    await openPublishFlow(page);

    // set the publish type
    await page.locator('[data-test-setting="publish-type"] > button').click();
    await page.locator(`[data-test-publish-type="${type}"]`).setChecked(true);

    if (time) {
        await page.locator('[data-test-setting="publish-at"] > button').click();
        await page.locator('[data-test-radio="schedule"] + label').click();
        await page.locator('[data-test-date-time-picker-time-input]').fill(time);
    }

    // TODO: set other publish options

    // continue to confirmation step
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]').click();

    // TODO: assert publish flow has expected confirmation details

    // (we need force because the button is animating)
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]').click({force: true});

    // TODO: assert publish flow has expected completion details

    // open the published post in a new tab
    const [frontendPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[data-test-complete-bookmark]').click()
    ]);

    await closePublishFlow(page);
    return frontendPage;
};

test.describe('Publishing', () => {
    test.describe('Publish post', () => {
        test('Post should only be available on web', async ({page}) => {
            await page.goto('/ghost');
            await createPost(page);
            const frontendPage = await publishPost(page);

            // Check if 'This is my post body.' is present on page1
            await expect(frontendPage.locator('.gh-canvas .article-title')).toHaveText('Hello world');
            await expect(frontendPage.locator('.gh-content.gh-canvas > p')).toHaveText('This is my post body.');
        });
    });

    test.describe('Update post', () => {
        test('Can update a published post', async ({page: adminPage, browser}) => {
            await adminPage.goto('/ghost');

            await createPost(adminPage, {title: 'Testing publish update', body: 'This is the initial published text.'});
            const frontendPage = await publishPost(adminPage);
            const frontendBody = frontendPage.getByRole('main');

            // check front-end post has the initial body text
            await expect(frontendBody).toContainText('This is the initial published text.');

            // add some extra text to the post
            await adminPage.locator('[data-kg="editor"]').click();
            await adminPage.keyboard.press('Enter');
            await adminPage.keyboard.type('This is some updated text.');

            // save
            await adminPage.locator('[data-test-button="publish-save"]').click();

            // check front-end has new text after reloading
            await frontendPage.waitForTimeout(100); // let save go through
            await frontendPage.reload();
            await expect(frontendBody).toContainText('This is some updated text.');
        });
    });

    test.describe('Schedule post', () => {
        test('Post should be published to web only at the scheduled time', async ({page}) => {
            await page.goto('/ghost');
            await createPost(page, {
                title: 'Scheduled post test',
                body: 'This is my scheduled post body.'
            });

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(page, {time: '00:00'});

            // Go to the homepage and check if the post is not yet visible there
            await page.goto('/');

            let lastPost = await page.locator('.post-card-content-link').first();
            await expect(lastPost).not.toHaveAttribute('href', '/scheduled-post-test/');

            // Now wait for 5 seconds
            await page.waitForTimeout(5000);

            // Check again, now it should have been added to the page
            await page.reload();
            lastPost = await page.locator('.post-card-content-link').first();
            await expect(lastPost).toHaveAttribute('href', '/scheduled-post-test/');

            // Go to the page
            await lastPost.click();

            // Check if the title and body are present on this page
            await expect(page.locator('.gh-canvas .article-title')).toHaveText('Scheduled post test');
            await expect(page.locator('.gh-content.gh-canvas > p')).toHaveText('This is my scheduled post body.');
        });
    });
});
