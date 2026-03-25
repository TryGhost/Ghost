import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {DesktopPreviewFrame,PostPreviewModal} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

type PostVisibility = 'public' | 'members' | 'paid' | 'tiers';
type PublishFlowOption = 'publish' | 'publish+send' | 'send';
export type PublishAction = 'publish' | 'publish-and-email' | 'email-only';

export interface PublishPostOptions {
    action?: PublishAction;
    date?: string;
    time?: string;
}

function normalizePostPath(rawValue: string): string {
    const value = rawValue.trim();

    if (value.startsWith('http://') || value.startsWith('https://')) {
        return new URL(value).pathname;
    }

    const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;
    readonly visibilitySelect: Locator;
    readonly customExcerptInput: Locator;
    readonly deletePostButton: Locator;
    readonly deletePostConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
        this.visibilitySelect = page.locator('[data-test-select="post-visibility"]');
        this.customExcerptInput = page.locator('[data-test-field="custom-excerpt"]');
        this.deletePostButton = page.locator('[data-test-button="delete-post"]');
        this.deletePostConfirmButton = page.locator('[data-test-button="delete-post-confirm"]');
    }

    async getPostPath(): Promise<string> {
        const postUrl = await this.postUrlInput.inputValue();
        return normalizePostPath(postUrl);
    }

    async setVisibility(visibility: PostVisibility): Promise<void> {
        await this.visibilitySelect.selectOption(visibility);
    }

    async deletePost(): Promise<void> {
        await this.deletePostButton.click();
        await this.deletePostConfirmButton.click();
    }
}

class PublishFlow extends BasePage {
    readonly modal: Locator;
    readonly publishButton: Locator;
    readonly publishTypeSetting: Locator;
    readonly publishTypeButton: Locator;
    readonly publishAndEmailOption: Locator;
    readonly publishAndEmailOptionLabel: Locator;
    readonly emailOnlyOption: Locator;
    readonly emailOnlyOptionLabel: Locator;
    readonly publishTypeSummary: Locator;
    readonly emailRecipientsSetting: Locator;
    readonly emailRecipientsSummary: Locator;
    readonly publishAtButton: Locator;
    readonly scheduleRadio: Locator;
    readonly scheduleDateInput: Locator;
    readonly scheduleTimeInput: Locator;
    readonly continueButton: Locator;
    readonly confirmPublishButton: Locator;
    readonly closeButton: Locator;
    readonly optionsTitle: Locator;
    readonly confirmTitle: Locator;

    constructor(page: Page) {
        super(page);

        this.modal = page.locator('[data-test-modal="publish-flow"]');
        this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
        this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
        this.publishTypeButton = this.publishTypeSetting.locator('> button');
        this.publishAndEmailOption = page.locator('[data-test-publish-type="publish+send"]');
        this.publishAndEmailOptionLabel = page.locator('[data-test-publish-type="publish+send"] + label');
        this.emailOnlyOption = page.locator('[data-test-publish-type="send"]');
        this.emailOnlyOptionLabel = page.locator('[data-test-publish-type="send"] + label');
        this.publishTypeSummary = this.publishTypeSetting.locator('[data-test-setting-title]');
        this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
        this.emailRecipientsSummary = this.emailRecipientsSetting.locator('[data-test-setting-title]');
        this.publishAtButton = page.locator('[data-test-setting="publish-at"] > button');
        this.scheduleRadio = page.locator('[data-test-radio="schedule"] + label');
        this.scheduleDateInput = page.locator('[data-test-date-time-picker-date-input]');
        this.scheduleTimeInput = page.locator('[data-test-date-time-picker-time-input]');
        this.continueButton = this.modal.locator('[data-test-button="continue"]');
        this.confirmPublishButton = this.modal.locator('[data-test-button="confirm-publish"]');
        this.closeButton = page.locator('[data-test-button="publish-flow-publish"]');
        this.optionsTitle = page.locator('[data-test-publish-flow="options"]');
        this.confirmTitle = page.locator('[data-test-publish-flow="confirm"]');
    }

    async open(): Promise<void> {
        await this.publishButton.click();
        await this.modal.waitFor({state: 'visible'});
        await this.optionsTitle.waitFor({state: 'visible'});
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    private actionToOption(action: PublishAction): PublishFlowOption {
        if (action === 'publish-and-email') {
            return 'publish+send';
        }

        if (action === 'email-only') {
            return 'send';
        }

        return 'publish';
    }

    async selectPublishAction(action: PublishAction): Promise<void> {
        const option = this.actionToOption(action);
        await this.publishTypeButton.click();
        await this.page.locator(`[data-test-publish-type="${option}"] + label`).click();
    }

    async schedule({date, time}: Pick<PublishPostOptions, 'date' | 'time'>): Promise<void> {
        if (!date && !time) {
            return;
        }

        await this.publishAtButton.click();
        await this.scheduleRadio.click();

        if (date) {
            await this.scheduleDateInput.fill(date);
            await this.scheduleDateInput.blur();
        }

        if (time) {
            await this.scheduleTimeInput.fill(time);
            await this.scheduleTimeInput.blur();
        }
    }

    async continueToConfirm(): Promise<void> {
        await this.continueButton.click();
        await this.confirmTitle.waitFor({state: 'visible'});
    }

    async confirm(): Promise<void> {
        // Required because the confirm button uses a pulse animation and can remain unstable.
        // eslint-disable-next-line playwright/no-force-option
        await this.confirmPublishButton.click({force: true});
        await this.confirmPublishButton.waitFor({state: 'hidden'});
    }

    async publish({action = 'publish', date, time}: PublishPostOptions = {}): Promise<void> {
        await this.open();
        await this.selectPublishAction(action);
        await this.schedule({date, time});
        await this.continueToConfirm();
        await this.confirm();
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly lexicalEditor: Locator;
    readonly postStatus: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;
    readonly publishFlow: PublishFlow;
    readonly updateFlowButton: Locator;
    readonly publishSaveButton: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.lexicalEditor = page.locator('[data-lexical-editor="true"]').first();
        this.postStatus = page.locator('[data-test-editor-post-status]').first();
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
        this.publishFlow = new PublishFlow(page);
        this.updateFlowButton = page.locator('[data-test-button="update-flow"]').first();
        this.publishSaveButton = page.locator('[data-test-button="publish-save"]').first();

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createDraft({title, body}: {title: string; body: string}): Promise<void> {
        await this.titleInput.fill(title);
        await this.titleInput.press('Enter');
        await this.lexicalEditor.waitFor({state: 'visible'});
        await this.lexicalEditor.click();
        await this.page.keyboard.type(body);
    }

    async getPostPath(): Promise<string> {
        await this.openSettingsMenu();
        const postPath = await this.settingsMenu.getPostPath();
        await this.closeSettingsMenu();
        return postPath;
    }

    async setVisibility(visibility: PostVisibility): Promise<void> {
        await this.openSettingsMenu();
        await this.settingsMenu.setVisibility(visibility);
        await this.closeSettingsMenu();
    }

    async deletePost(): Promise<void> {
        await this.openSettingsMenu();
        await this.settingsMenu.deletePost();
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }

    private async openSettingsMenu(): Promise<void> {
        if (await this.settingsMenu.postUrlInput.isVisible()) {
            return;
        }

        await this.settingsToggleButton.click();
        await this.settingsMenu.postUrlInput.waitFor({state: 'visible'});
    }

    private async closeSettingsMenu(): Promise<void> {
        if (!await this.settingsMenu.postUrlInput.isVisible()) {
            return;
        }

        await this.settingsToggleButton.click();
        await this.settingsMenu.postUrlInput.waitFor({state: 'hidden'});
    }
}
