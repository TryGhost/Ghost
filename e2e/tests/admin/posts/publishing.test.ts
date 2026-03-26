import {PageEditorPage, PostEditorPage, PostsPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Publishing', () => {
    test.describe('Publish post', () => {
        test('publish only - post is available on web', async ({page}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Publish post only', body: 'This is my post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');

            await editor.publishFlow.open();
            await editor.publishFlow.selectPublishType('publish');
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Published');

            const postPage = new PostPage(page);
            const response = await postPage.goto('/publish-post-only/');
            expect(response?.status()).toBe(200);
            await expect(postPage.postTitle).toHaveText('Publish post only');
        });

        test('publish and email - post is published and sent', async ({page}) => {
            const memberFactory = createMemberFactory(page.request);
            await memberFactory.create({
                email: 'test+recipient1@example.com',
                name: 'Publishing member'
            });

            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Publish and email post', body: 'This is my post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');

            await editor.publishFlow.open();
            await editor.publishFlow.selectPublishType('publish+send');
            await editor.publishFlow.confirm();

            const postPage = new PostPage(page);
            const response = await postPage.goto('/publish-and-email-post/');
            expect(response?.status()).toBe(200);
            await expect(postPage.postTitle).toHaveText('Publish and email post');
        });

        test('email only - post is not available on web', async ({page}) => {
            const memberFactory = createMemberFactory(page.request);
            await memberFactory.create({
                email: 'test+recipient2@example.com',
                name: 'Publishing member'
            });

            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Email only post', body: 'This is my post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');

            await editor.publishFlow.open();
            await editor.publishFlow.selectPublishType('send');
            await editor.publishFlow.confirm();

            const postPage = new PostPage(page);
            const response = await postPage.goto('/email-only-post/', {waitUntil: 'commit'});
            expect(response?.status()).toBe(404);
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

            const postPage = new PostPage(page);
            const response = await postPage.goto('/published-page-test/');
            expect(response?.status()).toBe(200);
            await expect(postPage.postTitle).toHaveText('Published page test');
        });

        test('scheduled - page is published after schedule fires', async ({page}) => {
            const pageEditor = new PageEditorPage(page);
            await pageEditor.gotoNewPage();
            await pageEditor.createDraft({title: 'Scheduled page test', body: 'This is my scheduled page body.'});
            await expect(pageEditor.postStatus).toContainText('Draft - Saved');

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            await pageEditor.publishFlow.open();
            await pageEditor.publishFlow.schedule({date: dateStr, time: '00:00'});
            await pageEditor.publishFlow.confirm();
            await pageEditor.publishFlow.close();

            await expect(pageEditor.postStatus).toContainText('Scheduled');

            await page.waitForTimeout(6000);

            const postPage = new PostPage(page);
            const response = await postPage.goto('/scheduled-page-test/');
            expect(response?.status()).toBe(200);
            await expect(postPage.postTitle).toHaveText('Scheduled page test');
        });
    });

    test.describe('Update post', () => {
        test('can update a published post', async ({page}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Testing publish update', body: 'This is the initial published text.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');
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
            await expect(postPage.postHeader).toContainText('Jan 7, 2022');
            await expect(postPage.metaDescription).toHaveAttribute('content', 'Short description and meta');
        });
    });

    test.describe('Schedule post', () => {
        test('scheduled publish only - post appears after schedule fires', async ({page}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Scheduled post test', body: 'This is my scheduled post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');
            const editorUrl = page.url();

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            await editor.publishFlow.open();
            await editor.publishFlow.schedule({date: dateStr, time: '00:00'});
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Scheduled');

            const postPage = new PostPage(page);
            const response = await postPage.goto('/scheduled-post-test/', {waitUntil: 'commit'});
            expect(response?.status()).toBe(404);

            await page.waitForTimeout(6000);

            const response2 = await postPage.goto('/scheduled-post-test/');
            expect(response2?.status()).toBe(200);

            await page.goto(editorUrl);
            await expect(editor.postStatus).toContainText('Published');
        });

        test('scheduled publish and email - post appears and is sent after schedule fires', async ({page}) => {
            const memberFactory = createMemberFactory(page.request);
            await memberFactory.create({
                email: 'test+recipient3@example.com',
                name: 'Publishing member'
            });

            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Scheduled publish email test', body: 'This is my scheduled post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');
            const editorUrl = page.url();

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            await editor.publishFlow.open();
            await editor.publishFlow.selectPublishType('publish+send');
            await editor.publishFlow.schedule({date: dateStr, time: '00:00'});
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Scheduled');

            const postPage = new PostPage(page);
            const response = await postPage.goto('/scheduled-publish-email-test/', {waitUntil: 'commit'});
            expect(response?.status()).toBe(404);

            await page.waitForTimeout(6000);

            const response2 = await postPage.goto('/scheduled-publish-email-test/');
            expect(response2?.status()).toBe(200);

            await page.goto(editorUrl);
            await expect(editor.postStatus).toContainText('Published');
        });

        test('scheduled email only - post is sent but not published', async ({page}) => {
            const memberFactory = createMemberFactory(page.request);
            await memberFactory.create({
                email: 'test+recipient4@example.com',
                name: 'Publishing member'
            });

            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Scheduled email only test', body: 'This is my scheduled post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');
            const editorUrl = page.url();

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            await editor.publishFlow.open();
            await editor.publishFlow.selectPublishType('send');
            await editor.publishFlow.schedule({date: dateStr, time: '00:00'});
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Scheduled');

            const postPage = new PostPage(page);
            const response = await postPage.goto('/scheduled-email-only-test/', {waitUntil: 'commit'});
            expect(response?.status()).toBe(404);

            await page.waitForTimeout(6000);

            await page.goto(editorUrl);
            await expect(editor.postStatus).toContainText('Sent');

            const response2 = await postPage.goto('/scheduled-email-only-test/', {waitUntil: 'commit'});
            expect(response2?.status()).toBe(404);
        });

        test('scheduled post can be unscheduled', async ({page, context}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Unschedule post test', body: 'This is my unscheduled post body.'});
            await expect(editor.postStatus).toContainText('Draft - Saved');
            const editorUrl = page.url();

            await editor.publishFlow.open();
            await editor.publishFlow.schedule({date: '2050-01-01', time: '10:09'});
            await editor.publishFlow.confirm();
            await editor.publishFlow.close();

            await expect(editor.postStatus).toContainText('Scheduled');

            const checkPage = await context.newPage();
            const postPage = new PostPage(checkPage);
            const response = await postPage.goto('/unschedule-post-test/', {waitUntil: 'commit'});
            expect(response?.status()).toBe(404);

            await page.goto(editorUrl);
            await editor.updateFlow.revertToDraft();

            await expect(editor.postStatus).toContainText('Draft - Saved');

            const response2 = await postPage.goto('/unschedule-post-test/', {waitUntil: 'commit'});
            expect(response2?.status()).toBe(404);
        });
    });

    test.describe('Delete post', () => {
        test('delete a saved post', async ({page}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Delete a post test', body: 'This is the content'});
            await expect(editor.postStatus).toContainText('Draft - Saved');

            await editor.openSettingsMenu();
            await editor.settingsMenu.deletePost();

            await expect(editor.screenTitle).toContainText('Posts');
        });

        test('delete a post with unsaved changes', async ({page}) => {
            const postsPage = new PostsPage(page);
            await postsPage.goto();
            await postsPage.newPostButton.click();

            const editor = new PostEditorPage(page);
            await editor.createDraft({title: 'Delete a post test', body: 'This is the content'});

            await editor.openSettingsMenu();
            await editor.settingsMenu.deletePost();

            await expect(editor.screenTitle).toContainText('Posts');
        });
    });
});
