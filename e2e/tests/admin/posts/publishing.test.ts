import {Page} from '@playwright/test';
import {PageEditorPage, PostEditorPage, PostsPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

function yesterdayDateStr(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

async function createNewPostDraft(page: Page, options: {title: string; body: string}) {
    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft(options);
    await expect(editor.postStatus).toContainText('Draft - Saved');
    return editor;
}

async function createMemberForEmail(page: Page, email: string) {
    const memberFactory = createMemberFactory(page.request);
    await memberFactory.create({email, name: 'Publishing member'});
}

async function publishWithType(editor: PostEditorPage, type: 'publish' | 'publish+send' | 'send') {
    await editor.publishFlow.open();
    await editor.publishFlow.selectPublishType(type);
    await editor.publishFlow.confirm();
}

async function scheduleAsap(editor: PostEditorPage, publishType?: 'publish+send' | 'send') {
    await editor.publishFlow.open();
    if (publishType) {
        await editor.publishFlow.selectPublishType(publishType);
    }
    await editor.publishFlow.schedule({date: yesterdayDateStr(), time: '00:00'});
    await editor.publishFlow.confirm();
    await editor.publishFlow.close();
    await expect(editor.postStatus).toContainText('Scheduled');
}

async function verifyPostNotAccessible(page: Page, slug: string) {
    const postPage = new PostPage(page);
    const response = await postPage.goto(slug, {waitUntil: 'commit'});
    expect(response?.status()).toBe(404);
    return postPage;
}

async function verifyPostAccessible(page: Page, slug: string, title: string) {
    const postPage = new PostPage(page);
    const response = await postPage.goto(slug);
    expect(response?.status()).toBe(200);
    await expect(postPage.postTitle).toHaveText(title);
}

async function waitForScheduledPost(page: Page) {
    // Ghost auto-corrects past dates to ~5 seconds from now, so we wait for the scheduler to fire
    await page.waitForTimeout(6000);
}

async function verifyScheduledPostPublishes(page: Page, slug: string, editorUrl: string, editor: PostEditorPage) {
    await verifyPostNotAccessible(page, slug);
    await waitForScheduledPost(page);

    const postPage = new PostPage(page);
    const response = await postPage.goto(slug);
    expect(response?.status()).toBe(200);

    await page.goto(editorUrl);
    await expect(editor.postStatus).toContainText('Published');
}

test.describe('Ghost Admin - Publishing', () => {
    test.describe('Publish post', () => {
        test('publish only - post is available on web', async ({page}) => {
            const editor = await createNewPostDraft(page, {title: 'Publish post only', body: 'This is my post body.'});

            await publishWithType(editor, 'publish');
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Published');

            await verifyPostAccessible(page, '/publish-post-only/', 'Publish post only');
        });

        test('publish and email - post is available on web', async ({page}) => {
            await createMemberForEmail(page, 'test+recipient1@example.com');
            const editor = await createNewPostDraft(page, {title: 'Publish and email post', body: 'This is my post body.'});

            await publishWithType(editor, 'publish+send');

            await verifyPostAccessible(page, '/publish-and-email-post/', 'Publish and email post');
        });

        test('email only - post is not available on web', async ({page}) => {
            await createMemberForEmail(page, 'test+recipient2@example.com');
            const editor = await createNewPostDraft(page, {title: 'Email only post', body: 'This is my post body.'});

            await publishWithType(editor, 'send');

            await verifyPostNotAccessible(page, '/email-only-post/');
        });
    });

    test.describe('Publish page', () => {
        test('immediately - page is available on web', async ({page}) => {
            const pageEditor = new PageEditorPage(page);
            await pageEditor.gotoNewPage();
            await pageEditor.createDraft({title: 'Published page test', body: 'This is my page body.'});
            await expect(pageEditor.postStatus).toContainText('Draft - Saved');

            await pageEditor.publishFlow.open();
            await pageEditor.publishFlow.confirm();
            await pageEditor.publishFlow.close();

            await expect(pageEditor.postStatus).toContainText('Published');

            await verifyPostAccessible(page, '/published-page-test/', 'Published page test');
        });

        test('scheduled - page is published after schedule fires', async ({page}) => {
            const pageEditor = new PageEditorPage(page);
            await pageEditor.gotoNewPage();
            await pageEditor.createDraft({title: 'Scheduled page test', body: 'This is my scheduled page body.'});
            await expect(pageEditor.postStatus).toContainText('Draft - Saved');

            await pageEditor.publishFlow.open();
            await pageEditor.publishFlow.schedule({date: yesterdayDateStr(), time: '00:00'});
            await pageEditor.publishFlow.confirm();
            await pageEditor.publishFlow.close();

            await expect(pageEditor.postStatus).toContainText('Scheduled');

            await waitForScheduledPost(page);

            await verifyPostAccessible(page, '/scheduled-page-test/', 'Scheduled page test');
        });
    });

    test.describe('Update post', () => {
        test('can update a published post', async ({page}) => {
            const editor = await createNewPostDraft(page, {title: 'Testing publish update', body: 'This is the initial published text.'});
            const editorUrl = page.url();

            await editor.publishFlow.open();
            await editor.publishFlow.confirm();
            const frontendPage = await editor.publishFlow.openPublishedPostBookmark();
            await editor.publishFlow.close();

            const postPage = new PostPage(frontendPage);
            await expect(postPage.articleBody).toContainText('This is the initial published text.');

            await page.goto(editorUrl);
            await editor.editor.click();
            await page.keyboard.type(' This is some updated text.');

            await editor.openSettingsMenu();
            await editor.settingsMenu.publishDateInput.fill('2022-01-07');
            await editor.settingsMenu.customExcerptInput.fill('Short description and meta');

            await expect(editor.updateFlow.saveButton).toHaveText('Update');
            await editor.updateFlow.save();
            await expect(editor.updateFlow.saveButton).toHaveText('Updated');

            await frontendPage.reload();
            await expect(postPage.articleBody).toContainText('This is some updated text.');
            await expect(postPage.postHeader).toContainText('Jan 2022');
            await expect(postPage.metaDescription).toHaveAttribute('content', 'Short description and meta');
        });
    });

    test.describe('Schedule post', () => {
        test('scheduled publish only - post appears after schedule fires', async ({page}) => {
            const editor = await createNewPostDraft(page, {title: 'Scheduled post test', body: 'This is my scheduled post body.'});
            const editorUrl = page.url();

            await scheduleAsap(editor);
            await verifyScheduledPostPublishes(page, '/scheduled-post-test/', editorUrl, editor);
        });

        test('scheduled publish and email - post appears on web after schedule fires', async ({page}) => {
            await createMemberForEmail(page, 'test+recipient3@example.com');
            const editor = await createNewPostDraft(page, {title: 'Scheduled publish email test', body: 'This is my scheduled post body.'});
            const editorUrl = page.url();

            await scheduleAsap(editor, 'publish+send');
            await verifyScheduledPostPublishes(page, '/scheduled-publish-email-test/', editorUrl, editor);
        });

        test('scheduled email only - post is not available on web after schedule fires', async ({page}) => {
            await createMemberForEmail(page, 'test+recipient4@example.com');
            const editor = await createNewPostDraft(page, {title: 'Scheduled email only test', body: 'This is my scheduled post body.'});
            const editorUrl = page.url();

            await scheduleAsap(editor, 'send');

            await verifyPostNotAccessible(page, '/scheduled-email-only-test/');
            await waitForScheduledPost(page);

            await page.goto(editorUrl);
            await expect(editor.postStatus).toContainText('Sent');

            await verifyPostNotAccessible(page, '/scheduled-email-only-test/');
        });

        test('scheduled post can be unscheduled', async ({page, context}) => {
            const editor = await createNewPostDraft(page, {title: 'Unschedule post test', body: 'This is my unscheduled post body.'});
            const editorUrl = page.url();

            await editor.publishFlow.open();
            await editor.publishFlow.schedule({date: '2050-01-01', time: '10:09'});
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Scheduled');

            const checkPage = await context.newPage();
            await verifyPostNotAccessible(checkPage, '/unschedule-post-test/');

            await page.goto(editorUrl);
            await editor.updateFlow.revertToDraft();

            await expect(editor.postStatus).toContainText('Draft - Saved');

            await verifyPostNotAccessible(checkPage, '/unschedule-post-test/');
        });
    });

    test.describe('Delete post', () => {
        test('delete a saved post', async ({page}) => {
            const editor = await createNewPostDraft(page, {title: 'Delete a post test', body: 'This is the content'});

            await editor.openSettingsMenu();
            await editor.settingsMenu.deletePost();

            await expect(editor.screenTitle).toContainText('Posts');
        });

        test('delete a post with unsaved changes', async ({page}) => {
            const editor = await createNewPostDraft(page, {title: 'Delete a post test', body: 'This is the content'});

            await editor.editor.click();
            await page.keyboard.type(' with unsaved edits');

            await editor.openSettingsMenu();
            await editor.settingsMenu.deletePost();

            await expect(editor.screenTitle).toContainText('Posts');
        });
    });
});
