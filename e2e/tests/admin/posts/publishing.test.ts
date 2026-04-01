import {APIRequestContext, Browser, BrowserContext, Page} from '@playwright/test';
import {Member, createMemberFactory, createPostFactory, createTierFactory, generateSlug} from '@/data-factory';
import {PageEditorPage, PostEditorPage, PostsPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';
import {signInAsMember} from '@/helpers/playwright/flows/sign-in';

async function getNewsletters(request: APIRequestContext): Promise<string[]> {
    const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
    const data = await response.json();
    return data.newsletters.map((n: {id: string}) => n.id);
}

async function expectFrontendStatus(page: Page, slug: string, status: number, timeout = 20000) {
    await expect.poll(async () => {
        const response = await page.request.get(`/${slug}/`);
        return response.status();
    }, {
        timeout
    }).toBe(status);
}

function formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getAsapSchedule() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return {
        date: formatDateInput(yesterday),
        time: '00:00'
    };
}

function formatFrontendDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

async function expectPostStatus(editor: PostEditorPage, status: string | RegExp, detail?: string | RegExp) {
    await expect(editor.postStatus.first()).toContainText(status);

    if (detail) {
        await editor.postStatus.first().hover();
        await expect(editor.postStatus.first()).toContainText(detail);
    }
}

function buildLexicalWithBody(body: string): string {
    return JSON.stringify({
        root: {
            children: [{
                children: [{
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: body,
                    type: 'text',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
}

async function createAuthenticatedPublicPage(browser: Browser, baseURL: string, member: Member): Promise<{context: BrowserContext; page: Page; postPage: PostPage}> {
    const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        }
    });
    const page = await context.newPage();
    await signInAsMember(page, member);

    return {
        context,
        page,
        postPage: new PostPage(page)
    };
}

test.describe('Ghost Admin - Publishing', () => {
    test.use({mailgunEnabled: true});

    test('publish only - post is visible on frontend', async ({page}) => {
        const postData = {title: 'Publish post only', body: 'This is my post body.'};

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft(postData);

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        const postPage = new PostPage(page);
        await postPage.goto(`/${generateSlug(postData.title)}/`);
        await expect(postPage.articleTitle).toHaveText(postData.title);
        await expect(postPage.articleBody).toHaveText(postData.body);
    });

    test('publish and email - post is visible on frontend', async ({page}) => {
        const postData = {title: 'Publish and email post', body: 'This is my post body.'};

        const memberFactory = createMemberFactory(page.request);
        const newsletters = await getNewsletters(page.request);
        await memberFactory.create({
            email: 'publish-email-test@example.com',
            name: 'Publishing member',
            newsletters
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft(postData);

        await editor.publishFlow.open();
        await editor.publishFlow.selectPublishType('publish+send');
        await editor.publishFlow.confirm();

        const postPage = new PostPage(page);
        await postPage.goto(`/${generateSlug(postData.title)}/`);
        await expect(postPage.articleTitle).toHaveText(postData.title);
        await expect(postPage.articleBody).toHaveText(postData.body);
    });

    test('email only - post is not visible on frontend', async ({page}) => {
        const postData = {title: 'Email only post', body: 'This is my post body.'};

        const memberFactory = createMemberFactory(page.request);
        const newsletters = await getNewsletters(page.request);
        await memberFactory.create({
            email: 'email-only-test@example.com',
            name: 'Publishing member',
            newsletters
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft(postData);

        await editor.publishFlow.open();
        await editor.publishFlow.selectPublishType('send');
        await editor.publishFlow.confirm();

        const slug = generateSlug(postData.title);
        const response = await page.goto(`/${slug}/`);
        expect(response?.status()).toBe(404);
    });

    test('unschedules a scheduled post', async ({page}) => {
        const title = `unschedule-post-${Date.now()}`;
        const body = 'This is my unscheduled post body.';
        const slug = generateSlug(title);

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.schedule({date: '2050-01-01'});
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /to be published\s+at .*2050/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);

        await postsPage.getPostByTitle(title).click();
        await editor.revertToDraft();
        await expect(editor.postStatus.first()).toContainText('Draft - Saved');
        await expectFrontendStatus(frontendPage, slug, 404);
    });

    test('scheduled publish only - post becomes visible on frontend', async ({page}) => {
        const title = `scheduled-publish-only-${Date.now()}`;
        const body = 'This is my scheduled post body.';
        const slug = generateSlug(title);

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.schedule(getAsapSchedule());
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expect(editor.postStatus.first()).toContainText('Scheduled');
        await expectFrontendStatus(page, slug, 200, 20000);

        const frontendPage = await page.context().newPage();
        const publicPage = new PostPage(frontendPage);

        await publicPage.gotoPost(slug);
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toHaveText(body);

        await postsPage.goto();
        await postsPage.getPostByTitle(title).click();
        await expectPostStatus(editor, 'Published');
    });

    test('scheduled publish and email - post becomes visible on frontend', async ({page}) => {
        const title = `scheduled-publish-email-${Date.now()}`;
        const body = 'This is my scheduled publish and email post body.';
        const slug = generateSlug(title);

        const memberFactory = createMemberFactory(page.request);
        const newsletters = await getNewsletters(page.request);
        await memberFactory.create({
            email: 'scheduled-publish-email@example.com',
            name: 'Publishing member',
            newsletters
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.selectPublishType('publish+send');
        await editor.publishFlow.schedule(getAsapSchedule());
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /published and sent/i);
        await expectPostStatus(editor, 'Scheduled', /few seconds/i);

        const frontendPage = await page.context().newPage();
        const publicPage = new PostPage(frontendPage);

        await expectFrontendStatus(frontendPage, slug, 404);
        await expectFrontendStatus(frontendPage, slug, 200, 20000);

        await publicPage.gotoPost(slug);
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toHaveText(body);

        await postsPage.goto();
        await postsPage.getPostByTitle(title).click();
        await expectPostStatus(editor, 'Published');
    });

    test('scheduled email only - post is not visible on frontend', async ({page}) => {
        const title = `scheduled-email-only-${Date.now()}`;
        const body = 'This is my scheduled email-only post body.';
        const slug = generateSlug(title);

        const memberFactory = createMemberFactory(page.request);
        const newsletters = await getNewsletters(page.request);
        await memberFactory.create({
            email: 'scheduled-email-only@example.com',
            name: 'Publishing member',
            newsletters
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.selectPublishType('send');
        await editor.publishFlow.schedule(getAsapSchedule());
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /to be sent/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);

        await postsPage.goto();
        await postsPage.getPostByTitle(title).click();
        await expect.poll(async () => {
            await page.reload();
            return await editor.postStatus.first().textContent();
        }, {
            timeout: 15000
        }).toContain('Sent');
        await expectPostStatus(editor, 'Sent', /Sent\s+to/i);
        await expectFrontendStatus(frontendPage, slug, 404);
    });

    test('scheduled publish only - page becomes visible on frontend', async ({page}) => {
        const title = `scheduled-page-only-${Date.now()}`;
        const body = 'This is my scheduled page body.';
        const slug = generateSlug(title);
        const editor = new PageEditorPage(page);

        await editor.gotoNew();
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.schedule(getAsapSchedule());
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /few seconds/i);

        const frontendPage = await page.context().newPage();
        const publicPage = new PostPage(frontendPage);

        await expectFrontendStatus(frontendPage, slug, 404);
        await expectFrontendStatus(frontendPage, slug, 200, 20000);

        await publicPage.gotoPost(slug);
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toHaveText(body);
    });

    test('publish only - page is visible on frontend', async ({page}) => {
        const title = `publish-page-only-${Date.now()}`;
        const body = 'This is my published page body.';
        const editor = new PageEditorPage(page);

        await editor.gotoNew();
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        await editor.publishFlow.close();

        await expect(editor.postStatus.first()).toContainText('Published');
        await expectFrontendStatus(page, generateSlug(title), 200);

        const frontendPage = await page.context().newPage();
        const publicPage = new PostPage(frontendPage);

        await publicPage.gotoPost(generateSlug(title));
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toHaveText(body);
    });

    test('members-only post shows subscriber gate', async ({page}) => {
        const title = `members-only-post-${Date.now()}`;
        const body = 'This is my members-only post body.';

        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({
            title,
            status: 'published',
            visibility: 'members',
            lexical: buildLexicalWithBody(body)
        });

        const publicPage = new PostPage(page);
        await publicPage.gotoPost(post.slug);
        await expect(publicPage.accessCtaHeading).toHaveText('This post is for subscribers only');
    });

    test('paid-members-only post shows paid subscriber gate', async ({page}) => {
        const title = `paid-members-only-post-${Date.now()}`;
        const body = 'This is my paid-members-only post body.';

        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({
            title,
            status: 'published',
            visibility: 'paid',
            lexical: buildLexicalWithBody(body)
        });

        const publicPage = new PostPage(page);
        await publicPage.gotoPost(post.slug);
        await expect(publicPage.accessCtaHeading).toHaveText('This post is for paying subscribers only');
    });

    test.describe('specific tier visibility', () => {
        test.use({stripeEnabled: true});

        test('only allows selected tier members', async ({page, browser}) => {
            const timestamp = Date.now();
            const title = `gold-tier-post-${timestamp}`;
            const body = 'Only gold members can see this';

            const tierFactory = createTierFactory(page.request);
            const memberFactory = createMemberFactory(page.request);

            const [disallowedTier, allowedTier] = await Promise.all([
                tierFactory.create({
                    name: `Silver ${timestamp}`,
                    currency: 'usd',
                    monthly_price: 500,
                    yearly_price: 5000
                }),
                tierFactory.create({
                    name: `Gold ${timestamp}`,
                    currency: 'usd',
                    monthly_price: 1000,
                    yearly_price: 10000
                })
            ]);

            const [disallowedMember, allowedMember] = await Promise.all([
                memberFactory.create({
                    email: `silver-tier-${timestamp}@example.com`,
                    name: 'Silver Member',
                    status: 'comped',
                    tiers: [{id: disallowedTier.id}]
                }),
                memberFactory.create({
                    email: `gold-tier-${timestamp}@example.com`,
                    name: 'Gold Member',
                    status: 'comped',
                    tiers: [{id: allowedTier.id}]
                })
            ]);

            const postFactory = createPostFactory(page.request);
            const post = await postFactory.create({
                title,
                status: 'published',
                visibility: 'tiers',
                tiers: [{id: allowedTier.id}],
                lexical: buildLexicalWithBody(body)
            });

            const accessMessage = `on the ${allowedTier.name} tier only`;
            const slug = post.slug;

            const anonymousPage = await page.context().newPage();
            try {
                const anonymousPostPage = new PostPage(anonymousPage);
                await anonymousPostPage.gotoPost(slug);
                await expect(anonymousPostPage.accessCtaHeading).toContainText(accessMessage);
            } finally {
                await anonymousPage.close();
            }

            const baseURL = new URL(page.url()).origin;
            const disallowedSession = await createAuthenticatedPublicPage(browser, baseURL, disallowedMember);
            const allowedSession = await createAuthenticatedPublicPage(browser, baseURL, allowedMember);

            try {
                await disallowedSession.postPage.gotoPost(slug);
                await expect(disallowedSession.postPage.accessCtaHeading).toContainText(accessMessage);

                await allowedSession.postPage.gotoPost(slug);
                await expect(allowedSession.postPage.accessCtaContent).toBeHidden();
                await expect(allowedSession.postPage.articleBody).toHaveText(body);
            } finally {
                await disallowedSession.context.close();
                await allowedSession.context.close();
            }
        });
    });

    test('updates a published post', async ({page}) => {
        const title = `publish-update-post-${Date.now()}`;
        const initialBody = 'This is the initial published text.';
        const appendedBodyText = 'This is some updated text.';
        const customExcerpt = 'Short description and meta';
        const editor = new PostEditorPage(page);

        await editor.goto();
        await editor.createDraft({title, body: initialBody});

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPost();
        await editor.publishFlow.close();

        const publicPage = new PostPage(frontendPage);
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toContainText(initialBody);
        await expect(publicPage.articleHeader).toContainText(formatFrontendDate(new Date()));

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.getPostByTitle(title).click();

        await editor.appendToBody(` ${appendedBodyText}`);
        await editor.settingsToggleButton.click();
        await editor.settingsMenu.publishDateInput.fill('2022-01-07');
        await editor.settingsMenu.customExcerptInput.fill(customExcerpt);

        await expect(editor.publishSaveButton).toHaveText('Update');
        await editor.publishSaveButton.click();
        await expect(editor.publishSaveButton).toHaveText('Updated');

        await frontendPage.reload();
        await expect(publicPage.articleBody).toContainText(appendedBodyText);
        await expect(publicPage.articleHeader).toContainText('7 Jan 2022');
        await expect(publicPage.metaDescription).toHaveAttribute('content', customExcerpt);
    });
});

test.describe('Ghost Admin - Deleting Posts', () => {
    test('delete a saved post - redirects to posts list', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill('Delete a post test');
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.settingsToggleButton.click();
        await editor.settingsMenu.deletePost();

        await expect(editor.screenTitle).toContainText('Posts');
    });

    test('delete a post with unsaved changes - redirects to posts list', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Delete a post test', body: 'This is the content'});

        await editor.settingsToggleButton.click();
        await editor.settingsMenu.deletePost();

        await expect(editor.screenTitle).toContainText('Posts');
    });
});
