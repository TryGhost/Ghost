import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {DesktopPreviewFrame,PostPreviewModal} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;
    readonly customExcerptInput: Locator;
    readonly deletePostButton: Locator;
    readonly deletePostConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
        this.customExcerptInput = page.locator('[data-test-field="custom-excerpt"]');
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
    readonly publishAtButton: Locator;
    readonly scheduleSummary: Locator;
    readonly scheduleDateInput: Locator;
    readonly scheduleTimeInput: Locator;
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
        this.publishAtButton = page.locator('[data-test-setting="publish-at"] > button');
        this.scheduleSummary = page.locator('[data-test-setting="publish-at"] [data-test-setting-title]');
        this.scheduleDateInput = page.locator('[data-test-date-time-picker-date-input]');
        this.scheduleTimeInput = page.locator('[data-test-date-time-picker-time-input]');
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

    async schedule({date, time}: {date?: string; time?: string}): Promise<void> {
        await this.publishAtButton.click();

        const textBeforeScheduleToggle = await this.scheduleSummary.textContent();
        await this.page.locator('[data-test-radio="schedule"] + label').click();
        await this.waitForScheduleSummaryChange(textBeforeScheduleToggle);

        if (date) {
            const textBeforeDateChange = await this.scheduleSummary.textContent();
            await this.scheduleDateInput.fill(date);
            await this.scheduleDateInput.blur();
            await this.waitForScheduleSummaryChange(textBeforeDateChange);
        }

        if (time) {
            await this.scheduleTimeInput.fill(time);
            await this.scheduleTimeInput.blur();
        }
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

    private async waitForScheduleSummaryChange(previousText: string | null): Promise<void> {
        await this.page.waitForFunction((text) => {
            const element = document.querySelector('[data-test-setting="publish-at"] [data-test-setting-title]');
            const currentText = element?.textContent?.trim();
            return Boolean(currentText && currentText !== text?.trim());
        }, previousText);
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
    readonly publishSaveButton: Locator;
    readonly updateFlowButton: Locator;
    readonly revertToDraftButton: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.locator('[data-test-editor-title-input]');
        this.postStatus = page.locator('[data-test-editor-post-status]');
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
        this.publishFlow = new PublishFlow(page);
        this.screenTitle = page.locator('[data-test-screen-title]');
        this.lexicalEditor = page.locator('[data-kg="editor"]').first();
        this.secondaryEditor = page.locator('[data-secondary-instance="true"]');
        this.publishSaveButton = page.locator('[data-test-button="publish-save"]').first();
        this.updateFlowButton = page.locator('[data-test-button="update-flow"]').first();
        this.revertToDraftButton = page.locator('[data-test-button="revert-to-draft"]');

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createDraft({title = 'Hello world', body = 'This is my post body.'} = {}): Promise<void> {
        const editor = this.page.locator('[data-lexical-editor="true"]').first();

        await this.titleInput.click();
        await this.titleInput.fill(title);
        await editor.waitFor({state: 'visible'});
        await this.page.keyboard.press('Enter');

        await this.page.waitForFunction(() => {
            const element = document.querySelector('[data-lexical-editor="true"]');
            if (!element) {
                return false;
            }

            const activeElement = document.activeElement;

            return Boolean(
                activeElement &&
                (activeElement === element || element.contains(activeElement))
            );
        });

        await this.page.keyboard.type(body);
    }

    async waitForSaved(): Promise<void> {
        await this.postStatus.filter({hasText: /Saved/}).waitFor({timeout: 30000});
    }

    async appendToBody(text: string): Promise<void> {
        await this.lexicalEditor.click();
        await this.page.keyboard.type(text);
    }

    async revertToDraft(): Promise<void> {
        await this.updateFlowButton.click();
        await this.revertToDraftButton.click();
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }
}

export class PageEditorPage extends PostEditorPage {
    readonly newPageButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/pages';
        this.newPageButton = page.locator('[data-test-new-page-button]');
    }

    async gotoNew(): Promise<void> {
        await this.page.goto(this.pageUrl);
        await this.newPageButton.click();
        await this.titleInput.waitFor({state: 'visible'});
    }
}
