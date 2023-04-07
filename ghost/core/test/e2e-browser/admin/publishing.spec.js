const {expect, test} = require('@playwright/test');
const {DateTime} = require('luxon');
const {slugify} = require('@tryghost/string');
const {createTier, createMember, createPostDraft, impersonateMember} = require('../utils');

/**
 * Test the status of a post in the post editor.
 * @param {import('@playwright/test').Page} page
 * @param {string} status The status you expect to see
 * @param {string} [hoverStatus] Optional different status when you hover the status
 */
const checkPostStatus = async (page, status, hoverStatus) => {
    await expect(page.locator('[data-test-editor-post-status]')).toContainText(status, {timeout: 5000});

    if (hoverStatus) {
        await page.locator('[data-test-editor-post-status]').hover();
        await expect(page.locator('[data-test-editor-post-status]')).toContainText(hoverStatus, {timeout: 5000});
    }
};

/**
 * Checks the post or page doesn't exist and returns a 404 page
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.slug]
 * @param {String} [options.title]
 */
const checkPostNotPublished = async (page, {slug, title}) => {
    if (!slug) {
        slug = slugify(title);
    }
    const url = `/${slug}/`;

    // Go to the page and check if the status code is 404
    const response = await page.goto(url);
    expect(response.status()).toBe(404);
};

/**
 * Checks the post or page doesn't exist and returns a 404 page
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.slug]
 * @param {String} options.title
 * @param {String} options.body
 */
const checkPostPublished = async (page, {slug, title, body}) => {
    if (!slug) {
        slug = slugify(title);
    }
    const url = `/${slug}/`;

    // Check again, now it should have been added to the page
    const response = await page.goto(url);
    expect(response.status()).toBe(200);

    // Check if the title and body are present on this page
    await expect(page.locator('.gh-canvas .article-title')).toHaveText(title);
    await expect(page.locator('.gh-content.gh-canvas > p')).toHaveText(body);
};

/**
 * Start a page draft with a filled in title and body. We can consider to move this to utils later.
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {String} [options.title]
 * @param {String} [options.body]
 */
const createPage = async (page, {title = 'Hello world', body = 'This is my post body.'} = {}) => {
    await page.locator('.gh-nav a[href="#/pages/"]').click();

    // Create a new post
    await page.locator('[data-test-new-page-button]').click();

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
 * @param {import('@playwright/test').Page} page
 */
const openPostSettingsMenu = async (page) => {
    await page.locator('[data-test-psm-trigger]').click();
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {'public'|'members'|'paid'|'tiers'} visibility
 */
const setPostVisibility = async (page, visibility) => {
    await page.locator('[data-test-select="post-visibility"]').selectOption(visibility);
};

/**
 * @typedef {Object} PublishOptions
 * @property {'publish'|'publish+send'|'send'|null} [type]
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
const publishPost = async (page, {type = 'publish', time, date} = {}) => {
    await openPublishFlow(page);

    // set the publish type
    if (type) {
        // Type is nullable because Pages don't have a publish type button
        await page.locator('[data-test-setting="publish-type"] > button').click();
        await page.locator(`[data-test-publish-type="${type}"] + label`).click({timeout: 1000}); // If this times out, it is likely that there are no members (running a single test).
    }

    // Schedule the post
    if (date || time) {
        await page.locator('[data-test-setting="publish-at"] > button').click();
        await page.locator('[data-test-radio="schedule"] + label').click();
    }

    if (date) {
        await page.locator('[data-test-date-time-picker-date-input]').fill(date);
    }

    if (time) {
        await page.locator('[data-test-date-time-picker-time-input]').fill(time);
    }

    // TODO: set other publish options

    // continue to confirmation step
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]').click();

    // TODO: assert publish flow has expected confirmation details

    // (we need force because the button is animating)
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]').click({force: true});

    // TODO: assert publish flow has expected completion details
};

/**
 * When on the publish flow completed step, click the bookmark
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Page>}
 */
const openPublishedPostBookmark = async (page) => {
    // open the published post in a new tab
    const [frontendPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[data-test-complete-bookmark]').click()
    ]);

    return frontendPage;
};

test.describe('Publishing', () => {
    test.describe('Publish post', () => {
        // Post should be available on web and sent as a newsletter
        test('Publish and Email', async ({page}) => {
            const postData = {
                title: 'Publish and email post',
                body: 'This is my post body.'
            };

            // Create a member to send and email to
            await createMember(page, {email: 'example@example.com', name: 'Publishing member'});

            await page.goto('/ghost');
            await createPostDraft(page, postData);
            await publishPost(page, {type: 'publish+send'});
            await closePublishFlow(page);

            await checkPostStatus(page, 'Published');
            await checkPostPublished(page, postData);
        });

        // Post should only be available on web
        test('Publish only', async ({page}) => {
            const postData = {
                title: 'Publish post only',
                body: 'This is my post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);
            await publishPost(page);
            await closePublishFlow(page);

            await checkPostStatus(page, 'Published');
            await checkPostPublished(page, postData);
        });

        // Post should be available on web and sent as a newsletter
        test('Email only', async ({page}) => {
            // Note: this currently depends on 'Publish and Email' to create a member!
            const postData = {
                title: 'Email only post',
                body: 'This is my post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);
            await publishPost(page, {type: 'send'});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Sent to '); // can't test for 1 member for now, because depends on test ordering :( (sometimes 2 members are created)

            await checkPostNotPublished(page, postData);
        });
    });

    test.describe('Publish page', () => {
        // A page can be published and become visible on web
        test('Immediately', async ({page}) => {
            const pageData = {
                // Title should be unique to avoid slug duplicates
                title: 'Published page test',
                body: 'This is my scheduled page body.'
            };

            await page.goto('/ghost');
            await createPage(page, pageData);
            await publishPost(page, {type: null});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Published');

            // Check published
            await checkPostPublished(page, pageData);
        });

        // Page should be published at the scheduled time
        test('At the scheduled time', async ({page}) => {
            const pageData = {
                // Title should be unique to avoid slug duplicates
                title: 'Scheduled page test',
                body: 'This is my scheduled page body.'
            };

            await page.goto('/ghost');
            await createPage(page, pageData);

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(page, {time: '00:00', type: null});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Scheduled', 'Scheduled to be published in a few seconds');

            // Go to the page and check if the status code is 404
            await checkPostNotPublished(page, pageData);

            // Now wait for 5 seconds
            await page.waitForTimeout(5000);

            // Check again, now it should have been added to the page
            await checkPostPublished(page, pageData);
        });
    });

    test.describe('Update post', () => {
        test.describe.configure({retries: 1});
        
        test('Can update a published post', async ({page: adminPage}) => {
            await adminPage.goto('/ghost');

            const date = DateTime.now();

            await createPostDraft(adminPage, {title: 'Testing publish update', body: 'This is the initial published text.'});
            await publishPost(adminPage);
            const frontendPage = await openPublishedPostBookmark(adminPage);
            await closePublishFlow(adminPage);
            const publishedBody = frontendPage.locator('main > article > section > p');
            const publishedHeader = frontendPage.locator('main > article > header');

            // check front-end post has the initial body text
            await expect(publishedBody).toContainText('This is the initial published text.');
            await expect(publishedHeader).toContainText(date.toFormat('LLL d, yyyy'));

            // add some extra text to the post
            await adminPage.locator('[data-kg="editor"]').click();
            await adminPage.waitForTimeout(200); //
            await adminPage.keyboard.type(' This is some updated text.');

            // change some post settings
            await openPostSettingsMenu(adminPage);
            await adminPage.fill('[data-test-date-time-picker-date-input]', '2022-01-07');
            await adminPage.fill('[data-test-field="custom-excerpt"]', 'Short description and meta');

            // save
            await adminPage.locator('[data-test-button="publish-save"]').click();

            // check front-end has new text after reloading
            await frontendPage.waitForTimeout(300); // let save go through
            await frontendPage.reload();
            await expect(publishedBody).toContainText('This is some updated text.');
            await expect(publishedHeader).toContainText('Jan 7, 2022');
            const metaDescription = frontendPage.locator('meta[name="description"]');
            await expect(metaDescription).toHaveAttribute('content', 'Short description and meta');
        });
    });

    test.describe('Schedule post', () => {
        // Post should be published to web and sent as a newsletter at the scheduled time
        test('Publish and Email', async ({page}) => {
            // Note: this currently depends on the first 'Publish and Email' to create a member!
            const postData = {
                // This title should be unique
                title: 'Scheduled post publish+email test',
                body: 'This is my scheduled post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(page, {time: '00:00', type: 'publish+send'});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Scheduled', 'Scheduled to be published and sent'); // Member count can differ, hence not included here
            await checkPostStatus(page, 'Scheduled', 'in a few seconds'); // Extra test for suffix on hover
            const editorUrl = await page.url();

            // Go to the homepage and check if the post is not yet visible there
            await checkPostNotPublished(page, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await page.waitForTimeout(5000);

            // Check again, now it should have been added to the page
            await checkPostPublished(page, postData);

            // Check status
            await page.goto(editorUrl);
            await checkPostStatus(page, 'Published');
        });

        // Post should be published to web only at the scheduled time
        test('Publish only', async ({page}) => {
            const postData = {
                title: 'Scheduled post test',
                body: 'This is my scheduled post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(page, {time: '00:00'});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Scheduled', 'Scheduled to be published in a few seconds');
            const editorUrl = await page.url();

            // Check not published yet
            await checkPostNotPublished(page, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await page.waitForTimeout(5000);

            // Check published
            await checkPostPublished(page, postData);

            // Check status
            await page.goto(editorUrl);
            await checkPostStatus(page, 'Published');
        });

        // Post should be published to web only at the scheduled time
        test('Email only', async ({page}) => {
            const postData = {
                title: 'Scheduled email only test',
                body: 'This is my scheduled post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(page, {type: 'send', time: '00:00'});
            await closePublishFlow(page);
            await checkPostStatus(page, 'Scheduled', 'Scheduled to be sent to');
            const editorUrl = await page.url();

            // Check not published yet
            await checkPostNotPublished(page, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await page.waitForTimeout(5000);

            // Check status
            await page.goto(editorUrl);
            await checkPostStatus(page, 'Sent', 'Sent to');

            // Stil not published yet (email only)
            await checkPostNotPublished(page, postData);
        });

        // A previously scheduled post can be unscheduled, which resets it to a draft
        test('A scheduled post should be able to be unscheduled', async ({page, context}) => {
            const postData = {
                title: 'Unschedule post test',
                body: 'This is my unscheduled post body.'
            };

            await page.goto('/ghost');
            await createPostDraft(page, postData);

            // Schedule far in the future
            await publishPost(page, {date: '2050-01-01', time: '10:09'});
            await closePublishFlow(page);

            // Check status
            await checkPostStatus(page, 'Scheduled', 'Scheduled to be published at 10:09 (UTC) on 01 Jan 2050');

            // Check not published
            const testPage = await context.newPage();

            // Check not published
            await checkPostNotPublished(testPage, postData);

            // Now unschedule this post
            await page.locator('[data-test-button="update-flow"]').click();
            await page.locator('[data-test-button="revert-to-draft"]').click();

            // Check status
            await checkPostStatus(page, 'Draft - Saved');

            // Check not published
            await checkPostNotPublished(testPage, postData);
        });
    });
});

test.describe('Updating post access', () => {
    test.describe('Change post visibility to members-only', () => {
        test('Only logged-in members (free or paid) can see', async ({page}) => {
            await page.goto('/ghost');

            await createPostDraft(page);
            await openPostSettingsMenu(page);
            await setPostVisibility(page, 'members');

            await publishPost(page);
            const frontendPage = await openPublishedPostBookmark(page);

            // Check if content gate for members is present on front-end
            await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toHaveText('This post is for subscribers only');
        });
    });

    test.describe('Change post visibility to paid-members-only', () => {
        test('Only logged-in, paid members can see', async ({page}) => {
            await page.goto('/ghost');

            await createPostDraft(page);
            await openPostSettingsMenu(page);
            await setPostVisibility(page, 'paid');

            await publishPost(page);
            const frontendPage = await openPublishedPostBookmark(page);

            // Check if content gate for paid members is present on front-end
            await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toHaveText('This post is for paying subscribers only');
        });
    });

    test.describe('Change post visibility to public', () => {
        test('Everyone can see', async ({page}) => {
            await page.goto('/ghost');

            await createPostDraft(page);
            await openPostSettingsMenu(page);
            await setPostVisibility(page, 'public');

            await publishPost(page);
            const frontendPage = await openPublishedPostBookmark(page);

            // Check if post content is publicly visible on front-end
            await expect(frontendPage.locator('.gh-content.gh-canvas > p')).toHaveText('This is my post body.');
        });
    });

    test('specific tiers', async ({page}) => {
        await page.goto('/ghost');

        // tiers and members are needed to test the access levels
        await createTier(page, {name: 'Silver', monthlyPrice: 5, yearlyPrice: 50});
        await createTier(page, {name: 'Gold', monthlyPrice: 10, yearlyPrice: 100});
        await createMember(page, {email: 'silver@example.com', compedPlan: 'Silver'});
        const silverMember = await page.url();
        await createMember(page, {email: 'gold@example.com', compedPlan: 'Gold'});
        const goldMember = await page.url();

        await createPostDraft(page, {body: 'Only gold members can see this'});

        await openPostSettingsMenu(page);
        await setPostVisibility(page, 'tiers');

        // backspace removes existing tiers
        await expect(page.locator('[data-test-visibility-segment-select] [data-test-selected-token]')).toHaveCount(3);
        await page.locator('[data-test-visibility-segment-select] input').click();
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(50);
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(50);
        await page.keyboard.press('Backspace');
        await expect(page.locator('[data-test-visibility-segment-select] [data-test-selected-token]')).toHaveCount(0);

        // specific tier can be added back on
        await page.keyboard.type('Go');
        const goldOption = page.locator('[data-test-visibility-segment-option="Gold"]');
        await goldOption.click();

        // publish
        await publishPost(page);
        const frontendPage = await openPublishedPostBookmark(page);

        // non-member doesn't have access
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toContainText('on the Gold tier only');

        // member on wrong tier doesn't have access
        await page.goto(silverMember);
        await impersonateMember(page);
        await frontendPage.reload();
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toContainText('on the Gold tier only');

        // member on selected tier has access
        await page.goto(goldMember);
        await impersonateMember(page);
        await frontendPage.reload();
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content')).not.toBeVisible();
        await expect(frontendPage.locator('.gh-content.gh-canvas > p')).toHaveText('Only gold members can see this');
    });
});
