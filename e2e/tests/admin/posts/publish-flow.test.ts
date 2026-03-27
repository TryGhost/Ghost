import {PostEditorPage, PostsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Publish Flow', () => {
    test('disabled subscription access hides membership features in publish flow', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('none');

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill('Test post');
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');
        await editor.publishFlow.open();

        await expect(editor.publishFlow.publishTypeButton).toHaveCount(0);
        await expect(editor.publishFlow.emailRecipientsSetting).toHaveCount(0);
    });
});
