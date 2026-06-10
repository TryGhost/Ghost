import {PostEditorPage, PostsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

/**
 * Publish flow tests, shared between the Ember implementation (labs flag
 * `editorX` off) and the React implementation (`editorX` on). Same page
 * objects and selectors for both runs.
 */
export function definePublishFlowTests() {
    test('disabled subscription access hides membership features in publish flow', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('none');

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill(`Membership-free publish flow ${faker.string.alphanumeric(8)}`);
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');
        await editor.publishFlow.open();

        await expect(editor.publishFlow.publishTypeButton).toHaveCount(0);
        await expect(editor.publishFlow.emailRecipientsSetting).toHaveCount(0);
    });
}
