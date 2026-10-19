import { PostEditorPage, PostsPage } from '@/admin-pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Publish Flow', () => {
  test('disabled subscription access leaves the publish flow without email', async ({ page }) => {
    const settingsService = new SettingsService(page.request);
    await settingsService.setMembersSignupAccess('none');
    // Admin reads settings as it boots, so only a reload picks the change up
    await page.reload();

    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft({ title: 'Test post' });
    await expect(editor.postStatus).toContainText('Draft - Saved');
    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();

    await expect(editor.publishFlow.publishTypeButton).toBeDisabled();
    await expect(editor.publishFlow.publishTypeButton).toContainText('Publish on site');
    await expect(editor.publishFlow.emailRecipientsSetting).toHaveCount(0);
  });
});
