import {APIRequestContext} from '@playwright/test';
import {PostEditorPage, PostsPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

async function getNewsletters(request: APIRequestContext): Promise<{id: string}[]> {
    const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
    const data = await response.json();
    return data.newsletters.map((n: {id: string}) => ({id: n.id}));
}

test.describe('Ghost Admin - Newsletter Send', () => {
    test.use({mailgunEnabled: true});

    test('publish and send newsletter - email is delivered to member', async ({page, emailClient}) => {
        const memberFactory = createMemberFactory(page.request);
        const newsletters = await getNewsletters(page.request);
        const member = await memberFactory.create({
            name: 'Newsletter Recipient',
            email: 'newsletter-test@example.com',
            newsletters: newsletters as never
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill('Test Newsletter Post');
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.publishFlow.open();
        await editor.publishFlow.selectPublishType('publish+send');
        await editor.publishFlow.confirm();

        const delivered = await emailClient.search(
            {to: member.email, subject: 'Test Newsletter Post'},
            {timeoutMs: 30_000}
        );
        expect(delivered.length).toBeGreaterThanOrEqual(1);

        const detail = await emailClient.getMessageDetailed(delivered[0]);
        expect(detail.HTML).toContain('Test Newsletter Post');
    });
});
