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
