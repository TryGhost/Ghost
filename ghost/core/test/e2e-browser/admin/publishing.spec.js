const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
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
    await expect(page.locator('[data-test-editor-post-status]').first()).toContainText(status, {timeout: 5000});

    if (hoverStatus) {
        await page.locator('[data-test-editor-post-status]').first().hover();
        await expect(page.locator('[data-test-editor-post-status]').first()).toContainText(hoverStatus, {timeout: 5000});
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
    await expect(page.locator('.gh-article-title')).toHaveText(title);
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

    // wait for editor to be ready
    await expect(page.locator('[data-lexical-editor="true"]').first()).toBeVisible();

    // Continue to the body by pressing enter
    await page.keyboard.press('Enter');

    await page.waitForTimeout(100); // allow new->draft switch to occur fully, without this some initial typing events can be missed
    await page.keyboard.type(body);
};

/**
 * @param {import('@playwright/test').Page} page
 */
const openPublishFlow = async (page) => {
    await page.locator('[data-test-button="publish-flow"]').first().click();
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
        // Type is nullable because pages don't have a publish type button
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
        test('Publish and Email', async ({sharedPage}) => {
            const postData = {
                title: 'Publish and email post',
                body: 'This is my post body.'
            };

            // Create a member to send and email to
            await createMember(sharedPage, {email: 'test+recipient1@example.com', name: 'Publishing member'});

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);
            await publishPost(sharedPage, {type: 'publish+send'});
            await closePublishFlow(sharedPage);
            await checkPostPublished(sharedPage, postData);
        });

        // Post should only be available on web
        test('Publish only', async ({sharedPage}) => {
            const postData = {
                title: 'Publish post only',
                body: 'This is my post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);
            await publishPost(sharedPage);
            await closePublishFlow(sharedPage);

            await checkPostStatus(sharedPage, 'Published');
            await checkPostPublished(sharedPage, postData);
        });

        // Post should be available on web and sent as a newsletter
        test('Email only', async ({sharedPage}) => {
            const postData = {
                title: 'Email only post',
                body: 'This is my post body.'
            };

            await createMember(sharedPage, {email: 'test+recipient2@example.com', name: 'Publishing member'});

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);
            await publishPost(sharedPage, {type: 'send'});
            await closePublishFlow(sharedPage);
            await checkPostNotPublished(sharedPage, postData);
        });
    });

    test.describe('Publish page', () => {
        // A page can be published and become visible on web
        test('Immediately', async ({sharedPage}) => {
            const pageData = {
                // Title should be unique to avoid slug duplicates
                title: 'Published page test',
                body: 'This is my scheduled page body.'
            };

            await sharedPage.goto('/ghost');
            await createPage(sharedPage, pageData);
            await publishPost(sharedPage, {type: null});
            await closePublishFlow(sharedPage);
            await checkPostStatus(sharedPage, 'Published');

            // Check published
            await checkPostPublished(sharedPage, pageData);
        });

        // page should be published at the scheduled time
        test('At the scheduled time', async ({sharedPage}) => {
            const pageData = {
                // Title should be unique to avoid slug duplicates
                title: 'Scheduled sharedPage test',
                body: 'This is my scheduled sharedPage body.'
            };

            await sharedPage.goto('/ghost');
            await createPage(sharedPage, pageData);

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(sharedPage, {time: '00:00', type: null});
            await closePublishFlow(sharedPage);
            await checkPostStatus(sharedPage, 'Scheduled', 'Scheduled to be published in a few seconds');

            // Go to the page and check if the status code is 404
            await checkPostNotPublished(sharedPage, pageData);

            // Now wait for 5 seconds
            await sharedPage.waitForTimeout(5000);

            // Check again, now it should have been added to the page
            await checkPostPublished(sharedPage, pageData);
        });
    });

    test.describe('Lexical Rendering', () => {
        test.describe.configure({retries: 1});

        test('Renders Lexical editor', async ({sharedPage: adminPage}) => {
            await adminPage.goto('/ghost');

            await createPostDraft(adminPage, {title: 'Lexical editor test', body: 'This is my post body.'});

            // Check if the lexical editor is present
            expect(await adminPage.locator('[data-kg="editor"]').first()).toBeVisible();
        });

        test('Renders secondary hidden lexical editor', async ({sharedPage: adminPage}) => {
            await adminPage.goto('/ghost');
            await createPostDraft(adminPage, {title: 'Secondary lexical editor test', body: 'This is my post body.'});
            const secondaryLexicalEditor = adminPage.locator('[data-secondary-instance="true"]');
            // Check if the secondary lexical editor exists
            await expect(secondaryLexicalEditor).toHaveCount(1);
            // Check if it is hidden
            await expect(secondaryLexicalEditor).toBeHidden();
        });
    });

    test.describe('Update post', () => {
        test.describe.configure({retries: 1});

        test('Can update a published post', async ({sharedPage: adminPage}) => {
            await adminPage.goto('/ghost');

            const date = DateTime.now();

            await createPostDraft(adminPage, {title: 'Testing publish update', body: 'This is the initial published text.'});
            const editorUrl = await adminPage.url();
            await publishPost(adminPage);
            const frontendPage = await openPublishedPostBookmark(adminPage);
            await closePublishFlow(adminPage);
            const publishedBody = frontendPage.locator('main > article > section > p');
            const publishedHeader = frontendPage.locator('main > article > header');

            // check front-end post has the initial body text
            await expect(publishedBody).toContainText('This is the initial published text.');
            await expect(publishedHeader).toContainText(date.toFormat('LLL d, yyyy'));

            // add some extra text to the post
            await adminPage.goto(editorUrl);
            await adminPage.locator('[data-kg="editor"]').first().click();
            await adminPage.waitForTimeout(500);
            await adminPage.keyboard.type(' This is some updated text.');

            // change some post settings
            await openPostSettingsMenu(adminPage);
            await adminPage.fill('[data-test-date-time-picker-date-input]', '2022-01-07');
            await adminPage.fill('[data-test-field="custom-excerpt"]', 'Short description and meta');

            // save
            const saveButton = await adminPage.locator('[data-test-button="publish-save"]').first();
            await expect(saveButton).toHaveText('Update');
            await saveButton.click();
            await expect(saveButton).toHaveText('Updated');

            // check front-end has new text after reloading
            await frontendPage.reload();
            await expect(publishedBody).toContainText('This is some updated text.');
            await expect(publishedHeader).toContainText('Jan 7, 2022');
            const metaDescription = frontendPage.locator('meta[name="description"]');
            await expect(metaDescription).toHaveAttribute('content', 'Short description and meta');
        });
    });

    test.describe('Schedule post', () => {
        // Post should be published to web and sent as a newsletter at the scheduled time
        test('Scheduled Publish and Email', async ({sharedPage}) => {
            const postData = {
                // This title should be unique
                title: 'Scheduled post publish+email test',
                body: 'This is my scheduled post body.'
            };

            await createMember(sharedPage, {email: 'test+recipient3@example.com', name: 'Publishing member'});

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);

            const editorUrl = await sharedPage.url();

            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(sharedPage, {time: '00:00', type: 'publish+send'});
            await closePublishFlow(sharedPage);
            await checkPostStatus(sharedPage, 'Scheduled', 'Scheduled to be published and sent'); // Member count can differ, hence not included here
            await checkPostStatus(sharedPage, 'Scheduled', 'in a few seconds'); // Extra test for suffix on hover

            // Go to the homepage and check if the post is not yet visible there
            await checkPostNotPublished(sharedPage, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await sharedPage.waitForTimeout(5000);

            // Check again, now it should have been added to the page
            await checkPostPublished(sharedPage, postData);

            // Check status
            await sharedPage.goto(editorUrl);
            await checkPostStatus(sharedPage, 'Published');
        });

        // Post should be published to web only at the scheduled time
        test('Scheduled Publish only', async ({sharedPage}) => {
            const postData = {
                title: 'Scheduled post test',
                body: 'This is my scheduled post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);

            const editorUrl = await sharedPage.url();
            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(sharedPage, {time: '00:00'});
            await closePublishFlow(sharedPage);
            await checkPostStatus(sharedPage, 'Scheduled', 'Scheduled to be published in a few seconds');

            // Check not published yet
            await checkPostNotPublished(sharedPage, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await sharedPage.waitForTimeout(5000);

            // Check published
            await checkPostPublished(sharedPage, postData);

            // Check status
            await sharedPage.goto(editorUrl);
            await checkPostStatus(sharedPage, 'Published');
        });

        // Post should be published to web only at the scheduled time
        test('Scheduled Email only', async ({sharedPage}) => {
            const postData = {
                title: 'Scheduled email only test',
                body: 'This is my scheduled post body.'
            };

            await createMember(sharedPage, {email: 'test+recipient4@example.com', name: 'Publishing member'});

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);
            const editorUrl = await sharedPage.url();
            
            // Schedule the post to publish asap (by setting it to 00:00, it will get auto corrected to the minimum time possible - 5 seconds in the future)
            await publishPost(sharedPage, {type: 'send', time: '00:00'});
            await closePublishFlow(sharedPage);
            await checkPostStatus(sharedPage, 'Scheduled', 'Scheduled to be sent in a few seconds');

            // Check not published yet
            await checkPostNotPublished(sharedPage, postData);

            // Now wait 5 seconds for the scheduled post to be published
            await sharedPage.waitForTimeout(5000);

            // Check status
            await sharedPage.goto(editorUrl);
            await checkPostStatus(sharedPage, 'Sent', 'Sent to');

            // Stil not published yet (email only)
            await checkPostNotPublished(sharedPage, postData);
        });

        // A previously scheduled post can be unscheduled, which resets it to a draft
        test('A scheduled post should be able to be unscheduled', async ({sharedPage, context}) => {
            const postData = {
                title: 'Unschedule post test',
                body: 'This is my unscheduled post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);

            const editorUrl = await sharedPage.url();

            // Schedule far in the future
            await publishPost(sharedPage, {date: '2050-01-01', time: '10:09'});
            await closePublishFlow(sharedPage);

            // Check status
            await checkPostStatus(sharedPage, 'Scheduled', 'Scheduled to be published at 10:09 (UTC) on 01 Jan 2050');

            // Check not published
            const testsharedPage = await context.newPage();

            // Check not published
            await checkPostNotPublished(testsharedPage, postData);

            // Now unschedule this post
            await sharedPage.goto(editorUrl);
            await sharedPage.locator('[data-test-button="update-flow"]').first().click();
            await sharedPage.locator('[data-test-button="revert-to-draft"]').click();

            // Check status
            await checkPostStatus(sharedPage, 'Draft - Saved');

            // Check not published
            await checkPostNotPublished(testsharedPage, postData);
        });
    });
});

test.describe('Updating post access', () => {
    test.describe('Change post visibility to members-only', () => {
        test('Only logged-in members (free or paid) can see', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            await createPostDraft(sharedPage);
            await openPostSettingsMenu(sharedPage);
            await setPostVisibility(sharedPage, 'members');

            await publishPost(sharedPage);
            const frontendPage = await openPublishedPostBookmark(sharedPage);

            // Check if content gate for members is present on front-end
            await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toHaveText('This post is for subscribers only');
        });
    });

    test.describe('Change post visibility to paid-members-only', () => {
        test('Only logged-in, paid members can see', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            await createPostDraft(sharedPage);
            await openPostSettingsMenu(sharedPage);
            await setPostVisibility(sharedPage, 'paid');

            await publishPost(sharedPage);
            const frontendPage = await openPublishedPostBookmark(sharedPage);

            // Check if content gate for paid members is present on front-end
            await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toHaveText('This post is for paying subscribers only');
        });
    });

    test.describe('Change post visibility to public', () => {
        test('Everyone can see', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            await createPostDraft(sharedPage);
            await openPostSettingsMenu(sharedPage);
            await setPostVisibility(sharedPage, 'public');

            await publishPost(sharedPage);
            const frontendPage = await openPublishedPostBookmark(sharedPage);

            // Check if post content is publicly visible on front-end
            await expect(frontendPage.locator('.gh-content.gh-canvas > p')).toHaveText('This is my post body.');
        });
    });

    test('specific tiers', async ({sharedPage}) => {
        await sharedPage.goto('/ghost');

        // tiers and members are needed to test the access levels
        await createTier(sharedPage, {name: 'Silver', monthlyPrice: 5, yearlyPrice: 50});
        await createTier(sharedPage, {name: 'Gold', monthlyPrice: 10, yearlyPrice: 100});
        await createMember(sharedPage, {email: 'silver@example.com', compedPlan: 'Silver'});
        const silverMember = await sharedPage.url();
        await createMember(sharedPage, {email: 'gold@example.com', compedPlan: 'Gold'});
        const goldMember = await sharedPage.url();

        await createPostDraft(sharedPage, {body: 'Only gold members can see this'});

        await openPostSettingsMenu(sharedPage);
        await setPostVisibility(sharedPage, 'tiers');

        // backspace removes existing tiers
        await expect(sharedPage.locator('[data-test-visibility-segment-select] [data-test-selected-token]')).toHaveCount(3);
        await sharedPage.locator('[data-test-visibility-segment-select] input').click();
        await sharedPage.keyboard.press('Backspace');
        await sharedPage.waitForTimeout(50);
        await sharedPage.keyboard.press('Backspace');
        await sharedPage.waitForTimeout(50);
        await sharedPage.keyboard.press('Backspace');
        await expect(sharedPage.locator('[data-test-visibility-segment-select] [data-test-selected-token]')).toHaveCount(0);

        // specific tier can be added back on
        await sharedPage.keyboard.type('Go');
        const goldOption = sharedPage.locator('[data-test-visibility-segment-option="Gold"]');
        await goldOption.click();

        // publish
        await publishPost(sharedPage);
        await closePublishFlow(sharedPage);
        const frontendPage = await openPublishedPostBookmark(sharedPage);

        // non-member doesn't have access
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toContainText('on the Gold tier only');

        // member on wrong tier doesn't have access
        await sharedPage.goto(silverMember);
        await impersonateMember(sharedPage);
        await frontendPage.reload();
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content h2')).toContainText('on the Gold tier only');

        // member on selected tier has access
        await sharedPage.goto(goldMember);
        await impersonateMember(sharedPage);
        await frontendPage.reload();
        await expect(frontendPage.locator('.gh-post-upgrade-cta-content')).not.toBeVisible();
        await expect(frontendPage.locator('.gh-content.gh-canvas > p')).toHaveText('Only gold members can see this');
    });

    test('publish time in timezone', async ({page}) => {
        await page.goto('/ghost');

        await createPostDraft(page, {title: 'Published in timezones', body: 'Published in timezones'});
        await openPostSettingsMenu(page);

        // saves the post with the new date
        await expect(page.locator('[data-test-date-time-picker-timezone]')).toHaveText('UTC');
        await page.locator('[data-test-date-time-picker-datepicker]').click();
        await page.locator('.ember-power-calendar-nav-control--previous').click();
        await page.locator('.ember-power-calendar-day', {hasText: '15'}).click();
        const dateTimePickerInput = await page.locator('[data-test-date-time-picker-time-input]');
        dateTimePickerInput.fill('12:00');
        await page.keyboard.press('Tab');

        // test will not work if the field is not filled appropriately
        await expect(dateTimePickerInput).toHaveValue('12:00');

        await publishPost(page);
        await closePublishFlow(page);

        // go to settings and change the timezone
        await page.locator('[data-test-nav="settings"]').click();
        await expect(page.getByTestId('timezone')).toContainText('UTC');

        await page.getByTestId('timezone').getByRole('button', {name: 'Edit'}).click();
        await page.getByTestId('timezone-select').click();
        await page.locator('[data-testid="select-option"]', {hasText: 'Tokyo'}).click();

        await page.getByTestId('timezone').getByRole('button', {name: 'Save'}).click();
        await expect(page.getByTestId('timezone-select')).toBeHidden();
        await expect(page.getByTestId('timezone')).toContainText('(GMT +9:00) Osaka, Sapporo, Tokyo');

        await page.getByTestId('exit-settings').click();
        await page.locator('[data-test-nav="posts"]').click();
        await page.locator('[data-test-post-id]', {hasText: /Published in timezones/}).click();

        await openPostSettingsMenu(page);

        await expect(page.locator('[data-test-date-time-picker-timezone]')).toHaveText('JST');
        await expect(page.locator('[data-test-date-time-picker-time-input]')).toHaveValue('21:00');
        await expect(page.locator('[data-test-date-time-picker-date-input]')).toHaveValue(/-15$/);
    });

    test('default recipient settings - usually nobody', async ({page}) => {
        // switch to "usually nobody" setting
        await page.goto('/ghost/settings/newsletters');
        await page.getByTestId('default-recipients').getByRole('button', {name: 'Edit'}).click();
        await page.getByTestId('default-recipients-select').click();
        await page.locator('[data-testid="select-option"]', {hasText: /Usually nobody/}).click();
        await page.getByTestId('default-recipients').getByRole('button', {name: 'Save'}).click();

        await expect(page.getByTestId('default-recipients-select')).toBeHidden();
        await expect(page.getByTestId('default-recipients')).toContainText('Usually nobody');

        await page.goto('/ghost');

        await createMember(page, {
            name: 'Test Member Recipient',
            email: 'test@recipient.com'
        });

        // go to publish a post
        await createPostDraft(page, {title: 'Published in timezones', body: 'Published in timezones'});
        await page.locator('[data-test-button="publish-flow"]').first().click();

        await expect(page.locator('[data-test-setting="publish-type"] [data-test-setting-title]')).toContainText('Publish');

        await expect(page.locator('[data-test-setting="email-recipients"] [data-test-setting-title]')).toContainText('Not sent as newsletter');

        await page.locator('[data-test-setting="publish-type"] [data-test-setting-title]').click();

        // email-related options are enabled
        await expect(page.locator('[data-test-publish-type="publish+send"]')).not.toBeDisabled();
        await expect(page.locator('[data-test-publish-type="send"]')).not.toBeDisabled();

        await page.locator('label[for="publish-type-publish+send"]').click();

        await expect(
            page.locator('[data-test-setting="email-recipients"] [data-test-setting-title]')
        ).toContainText(/\d+\s* subscriber/m);
    });
});

test.describe('Deleting a post', () => {
    test('Delete a saved post', async ({page}) => {
        await page.goto('/ghost');

        await createPostDraft(page, {title: 'Delete a post test', body: 'This is the content'});

        await expect(page.locator('[data-test-editor-post-status]')).toContainText('Draft - Saved');

        await openPostSettingsMenu(page);

        await page.locator('[data-test-button="delete-post"]').click();

        await page.locator('[data-test-button="delete-post-confirm"]').click();

        await expect(
            page.locator('[data-test-screen-title]')
        ).toContainText('Posts');
    });

    test('Delete a post with unsaved changes', async ({page}) => {
        await page.goto('/ghost');

        await createPostDraft(page, {title: 'Delete a post test', body: 'This is the content'});

        await openPostSettingsMenu(page);

        await page.locator('[data-test-button="delete-post"]').click();

        await page.locator('[data-test-button="delete-post-confirm"]').click();

        await expect(
            page.locator('[data-test-screen-title]')
        ).toContainText('Posts');
    });
});
