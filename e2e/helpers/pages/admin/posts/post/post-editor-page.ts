import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {DesktopPreviewFrame,PostPreviewModal} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
    }
}

class PublishFlow extends BasePage {
    readonly publishButton: Locator;
    readonly publishTypeSetting: Locator;
    readonly publishTypeButton: Locator;
    readonly emailRecipientsSetting: Locator;

    constructor(page: Page) {
        super(page);

        this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
        this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
        this.publishTypeButton = this.publishTypeSetting.locator('> button');
        this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
    }

    async open(): Promise<void> {
        await this.publishButton.click();
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly postStatus: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;
    readonly publishFlow: PublishFlow;

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

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }
}
