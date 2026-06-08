import {APIRequestContext, Page} from '@playwright/test';
import {PageEditorPage, PostEditorPage, PostsPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {createMemberFactory, generateSlug} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

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

function getFutureSchedule() {
    return {
        date: '2050-01-01'
    };
}

async function expectPostStatus(editor: PostEditorPage, status: string | RegExp, detail?: string | RegExp) {
    await expect(editor.postStatus.first()).toContainText(status);

    if (detail) {
        await editor.postStatus.first().hover();
        await expect(editor.postStatus.first()).toContainText(detail);
    }
}

async function waitForScheduledSaveResponse(page: Page, resource: 'posts' | 'pages') {
    const response = await page.waitForResponse((networkResponse) => {
        if (networkResponse.request().method() !== 'PUT' || networkResponse.status() !== 200) {
            return false;
        }

        const pathname = new URL(networkResponse.url()).pathname;
        if (!new RegExp(`/ghost/api/admin/${resource}/[^/]+/?$`).test(pathname)) {
            return false;
        }

        const postData = networkResponse.request().postData();
        if (!postData) {
            return false;
        }

        try {
            const payload = JSON.parse(postData) as Record<string, unknown>;
            const resources = payload[resource];

            if (!Array.isArray(resources)) {
                return false;
            }

            return resources.some((item) => {
                if (!item || typeof item !== 'object') {
                    return false;
                }

                const resourcePayload = item as Record<string, unknown>;
                return resourcePayload.status === 'scheduled' ||
                    (typeof resourcePayload.published_at === 'string' &&
                        resourcePayload.status !== 'published' &&
                        resourcePayload.status !== 'sent');
            });
        } catch {
            return false;
        }
    });

    expect(response.status()).toBe(200);
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

    test('scheduled publish only - post is scheduled', async ({page}) => {
        const title = `scheduled-publish-only-${Date.now()}`;
        const body = 'This is my scheduled post body.';
        const slug = generateSlug(title);

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.schedule(getFutureSchedule());
        await Promise.all([
            waitForScheduledSaveResponse(page, 'posts'),
            editor.publishFlow.confirm()
        ]);
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /to be published\s+at .*2050/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);
    });

    test('scheduled publish and email - post is scheduled', async ({page}) => {
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
        await editor.publishFlow.schedule(getFutureSchedule());
        await Promise.all([
            waitForScheduledSaveResponse(page, 'posts'),
            editor.publishFlow.confirm()
        ]);
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /published and sent/i);
        await expectPostStatus(editor, 'Scheduled', /2050/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);
    });

    test('scheduled email only - post is scheduled and not visible on frontend', async ({page}) => {
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
        await editor.publishFlow.schedule(getFutureSchedule());
        await Promise.all([
            waitForScheduledSaveResponse(page, 'posts'),
            editor.publishFlow.confirm()
        ]);
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /to be sent/i);
        await expectPostStatus(editor, 'Scheduled', /2050/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);
    });

    test('scheduled publish only - page is scheduled', async ({page}) => {
        const title = `scheduled-page-only-${Date.now()}`;
        const body = 'This is my scheduled page body.';
        const slug = generateSlug(title);
        const editor = new PageEditorPage(page);

        await editor.gotoNew();
        await editor.createDraft({title, body});

        await editor.publishFlow.open();
        await editor.publishFlow.schedule(getFutureSchedule());
        await Promise.all([
            waitForScheduledSaveResponse(page, 'pages'),
            editor.publishFlow.confirm()
        ]);
        await editor.publishFlow.close();

        await expectPostStatus(editor, 'Scheduled', /to be published\s+at .*2050/i);

        const frontendPage = await page.context().newPage();
        await expectFrontendStatus(frontendPage, slug, 404);
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
});
