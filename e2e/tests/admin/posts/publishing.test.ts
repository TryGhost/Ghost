import {MemberFactory, createMemberFactory} from '@/data-factory';
import {PostPage} from '@/public-pages';
import {PostsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createDraftPost, expect, test} from '@/helpers/playwright';
import type {APIRequestContext} from '@playwright/test';

async function getActiveNewsletterIds(request: APIRequestContext): Promise<string[]> {
    const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
    const data = await response.json() as {newsletters: Array<{id: string}>};
    return data.newsletters.map(newsletter => newsletter.id);
}

async function createNewsletter(request: APIRequestContext, name: string): Promise<string> {
    const response = await request.post('/ghost/api/admin/newsletters/', {
        data: {newsletters: [{name}]}
    });
    const data = await response.json() as {newsletters: Array<{id: string}>};
    return data.newsletters[0].id;
}

async function getOrCreateActiveNewsletterIds(request: APIRequestContext): Promise<string[]> {
    const activeNewsletterIds = await getActiveNewsletterIds(request);
    if (activeNewsletterIds.length > 0) {
        return activeNewsletterIds;
    }

    const newsletterId = await createNewsletter(request, `Publishing e2e ${Date.now()}`);
    return [newsletterId];
}

async function createSubscribedMember(
    memberFactory: MemberFactory,
    request: APIRequestContext,
    {email, name}: {email: string; name: string}
) {
    const newsletterIds = await getOrCreateActiveNewsletterIds(request);
    const newsletters = newsletterIds.map(id => ({id}));

    await memberFactory.create({
        email,
        name,
        subscribed_to_emails: 'true',
        // newsletters payload shape in API is [{id}], while member factory type is string[].
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newsletters: newsletters as any
    });
}

test.describe('Ghost Admin - Publishing', () => {
    test.describe.configure({timeout: 120000});

    let memberFactory: MemberFactory;
    let settingsService: SettingsService;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        settingsService = new SettingsService(page.request);

        await settingsService.setEditorDefaultEmailRecipients('visibility', null);
    });

    test('publish only makes post publicly available', async ({page}) => {
        const title = `Publish only ${Date.now()}`;
        const body = 'This post should be publicly available.';

        const {editor, postPath} = await createDraftPost(page, {title, body});

        await editor.publishFlow.publish();
        await expect(editor.postStatus).toContainText('Published');

        const response = await page.goto(postPath);
        expect(response?.status()).toBe(200);

        const postPage = new PostPage(page);
        await expect(postPage.postTitle).toContainText(title);
        await expect(postPage.postContent).toContainText(body);
    });

    test('send only keeps the post unpublished', async ({page}) => {
        const recipient = `publishing-send-only-${Date.now()}@example.com`;
        const title = `Send only ${Date.now()}`;
        const body = 'This post should only be delivered by email.';

        await createSubscribedMember(memberFactory, page.request, {
            email: recipient,
            name: 'Publishing Recipient'
        });

        const {editor, postPath} = await createDraftPost(page, {title, body});

        await editor.publishFlow.publish({action: 'email-only'});

        const response = await page.goto(postPath);
        expect(response?.status()).toBe(404);
    });

    test('publish and send publishes the post', async ({page}) => {
        const recipient = `publishing-publish-send-${Date.now()}@example.com`;
        const title = `Publish and send ${Date.now()}`;
        const body = 'This post should be published and emailed.';

        await createSubscribedMember(memberFactory, page.request, {
            email: recipient,
            name: 'Publishing Recipient'
        });

        const {editor, postPath} = await createDraftPost(page, {title, body});

        await editor.publishFlow.publish({action: 'publish-and-email'});

        const response = await page.goto(postPath);
        expect(response?.status()).toBe(200);

        const postPage = new PostPage(page);
        await expect(postPage.postTitle).toContainText(title);
        await expect(postPage.postContent).toContainText(body);
    });

    test('default recipients set to usually nobody keeps publish flow on publish-only', async ({page}) => {
        const recipient = `publishing-default-recipients-${Date.now()}@example.com`;

        await settingsService.setEditorDefaultEmailRecipients('filter', null);
        await createSubscribedMember(memberFactory, page.request, {
            email: recipient,
            name: 'Default Recipients Member'
        });

        const {editor} = await createDraftPost(page, {
            title: `Default recipients ${Date.now()}`,
            body: 'Recipient defaults test body'
        });

        await editor.publishFlow.open();

        await expect(editor.publishFlow.publishTypeSummary).toContainText('Publish');
        await expect(editor.publishFlow.emailRecipientsSummary).toContainText('Not sent as newsletter');

        await editor.publishFlow.publishTypeButton.click();
        await expect(editor.publishFlow.publishAndEmailOption).toBeEnabled();
        await expect(editor.publishFlow.emailOnlyOption).toBeEnabled();
        await editor.publishFlow.publishAndEmailOptionLabel.click();

        await expect(editor.publishFlow.emailRecipientsSummary).toContainText(/subscriber/i);

        await editor.publishFlow.close();
    });

    test('deletes saved and unsaved draft posts from the post settings menu', async ({page}) => {
        const firstTitle = `Delete saved draft ${Date.now()}`;
        const secondTitle = `Delete unsaved draft ${Date.now()}`;
        const postsPage = new PostsPage(page);

        const {editor: savedDraftEditor} = await createDraftPost(page, {
            title: firstTitle,
            body: 'Delete saved draft body'
        });
        await expect(savedDraftEditor.postStatus).toContainText('Draft');
        await savedDraftEditor.deletePost();
        await expect(postsPage.pageTitle).toContainText('Posts');

        const {editor: unsavedDraftEditor} = await createDraftPost(page, {
            title: secondTitle,
            body: 'Delete unsaved draft body'
        });
        await unsavedDraftEditor.lexicalEditor.click();
        await page.keyboard.type(' Unsaved content.');
        await unsavedDraftEditor.deletePost();
        await expect(postsPage.pageTitle).toContainText('Posts');
    });
});
