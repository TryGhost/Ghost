import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {DesktopPreviewFrame,PostPreviewModal} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;
    readonly deletePostButton: Locator;
    readonly deletePostConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
        this.deletePostButton = page.locator('[data-test-button="delete-post"]');
        this.deletePostConfirmButton = page.locator('[data-test-button="delete-post-confirm"]');
    }

    async deletePost(): Promise<void> {
        await this.deletePostButton.click();
        await this.deletePostConfirmButton.click();
    }
}

class PublishFlow extends BasePage {
    readonly publishButton: Locator;
    readonly publishTypeSetting: Locator;
    readonly publishTypeButton: Locator;
    readonly emailRecipientsSetting: Locator;
    readonly continueButton: Locator;
    readonly confirmButton: Locator;
    readonly closeButton: Locator;
    readonly completeBookmark: Locator;

    constructor(page: Page) {
        super(page);

        this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
        this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
        this.publishTypeButton = this.publishTypeSetting.locator('> button');
        this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
        this.continueButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]');
        this.confirmButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]');
        this.closeButton = page.locator('[data-test-button="close-publish-flow"]');
        this.completeBookmark = page.locator('[data-test-complete-bookmark]');
    }

    async open(): Promise<void> {
        await this.publishButton.click();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
    }

    async selectPublishType(type: 'publish' | 'publish+send' | 'send'): Promise<void> {
        await this.publishTypeButton.click();
        await this.page.locator(`[data-test-publish-type="${type}"] + label`).click();
    }

    async confirm(): Promise<void> {
        await this.continueButton.click();
        await this.confirmButton.click({force: true});
        await this.confirmButton.waitFor({state: 'hidden'});
    }

    async openPublishedPost(): Promise<Page> {
        const [frontendPage] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.completeBookmark.click()
        ]);
        return frontendPage;
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly postStatus: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;
    readonly publishFlow: PublishFlow;
    readonly screenTitle: Locator;
    readonly lexicalEditor: Locator;
    readonly secondaryEditor: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.postStatus = page.locator('[data-test-editor-post-status]');
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
        this.publishFlow = new PublishFlow(page);
        this.screenTitle = page.locator('[data-test-screen-title]');
        this.lexicalEditor = page.locator('[data-kg="editor"]').first();
        this.secondaryEditor = page.locator('[data-secondary-instance="true"]');

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createDraft({title = 'Hello world', body = 'This is my post body.'} = {}): Promise<void> {
        await this.titleInput.click();
        await this.titleInput.fill(title);
        await this.page.locator('[data-lexical-editor="true"]').first().waitFor({state: 'visible'});
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(100);
        await this.page.keyboard.type(body);
    }

    async waitForSaved(): Promise<void> {
        await this.postStatus.filter({hasText: /Saved/}).waitFor({timeout: 30000});
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }
}
