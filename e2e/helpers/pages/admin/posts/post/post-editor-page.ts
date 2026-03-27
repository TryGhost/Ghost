import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {DesktopPreviewFrame,PostPreviewModal} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;
    readonly publishTimezone: Locator;
    readonly visibilitySelect: Locator;
    readonly visibilitySegmentSelect: Locator;
    readonly customExcerptInput: Locator;
    readonly deletePostButton: Locator;
    readonly deletePostConfirmButton: Locator;
    readonly datepickerButton: Locator;
    readonly calendarPreviousMonth: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
        this.publishTimezone = page.locator('[data-test-date-time-picker-timezone]');
        this.visibilitySelect = page.locator('[data-test-select="post-visibility"]');
        this.visibilitySegmentSelect = page.locator('[data-test-visibility-segment-select]');
        this.customExcerptInput = page.locator('[data-test-field="custom-excerpt"]');
        this.deletePostButton = page.locator('[data-test-button="delete-post"]');
        this.deletePostConfirmButton = page.locator('[data-test-button="delete-post-confirm"]');
        this.datepickerButton = page.locator('[data-test-date-time-picker-datepicker]');
        this.calendarPreviousMonth = page.locator('.ember-power-calendar-nav-control--previous');
    }

    getCalendarDay(day: string): Locator {
        return this.page.locator('.ember-power-calendar-day', {hasText: day});
    }

    async setVisibility(visibility: 'public' | 'members' | 'paid' | 'tiers'): Promise<void> {
        await this.visibilitySelect.selectOption(visibility);
    }

    async deletePost(): Promise<void> {
        await this.deletePostButton.click();
        await this.deletePostConfirmButton.click();
    }

    async clearAllTiers(): Promise<void> {
        const input = this.visibilitySegmentSelect.locator('input');
        await input.click();
        const tokens = this.visibilitySegmentSelect.locator('[data-test-selected-token]');
        const count = await tokens.count();
        for (let i = 0; i < count; i++) {
            await this.page.keyboard.press('Backspace');
        }
    }

    async selectTier(tierName: string): Promise<void> {
        const input = this.visibilitySegmentSelect.locator('input');
        await input.fill(tierName.substring(0, 2));
        await this.page.locator(`[data-test-visibility-segment-option="${tierName}"]`).click();
    }
}

class PublishFlow extends BasePage {
    readonly publishButton: Locator;
    readonly publishTypeSetting: Locator;
    readonly publishTypeButton: Locator;
    readonly publishTypeTitle: Locator;
    readonly emailRecipientsSetting: Locator;
    readonly emailRecipientsTitle: Locator;
    readonly continueButton: Locator;
    readonly confirmButton: Locator;
    readonly closeButton: Locator;
    readonly bookmarkLink: Locator;
    readonly publishAtSetting: Locator;
    readonly publishAtButton: Locator;
    readonly publishAtTitle: Locator;
    readonly scheduleRadio: Locator;
    readonly scheduleDateInput: Locator;
    readonly scheduleTimeInput: Locator;
    readonly publishAndSendRadio: Locator;
    readonly sendOnlyRadio: Locator;
    readonly publishOnlyRadio: Locator;

    constructor(page: Page) {
        super(page);

        this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
        this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
        this.publishTypeButton = this.publishTypeSetting.locator('> button');
        this.publishTypeTitle = this.publishTypeSetting.locator('[data-test-setting-title]');
        this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
        this.emailRecipientsTitle = this.emailRecipientsSetting.locator('[data-test-setting-title]');
        this.continueButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]');
        this.confirmButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]');
        this.closeButton = page.locator('[data-test-button="close-publish-flow"]');
        this.bookmarkLink = page.locator('[data-test-complete-bookmark]');
        this.publishAtSetting = page.locator('[data-test-setting="publish-at"]');
        this.publishAtButton = this.publishAtSetting.locator('> button');
        this.publishAtTitle = this.publishAtSetting.locator('[data-test-setting-title]');
        this.scheduleRadio = page.locator('[data-test-radio="schedule"] + label');
        this.scheduleDateInput = page.locator('[data-test-date-time-picker-date-input]');
        this.scheduleTimeInput = page.locator('[data-test-date-time-picker-time-input]');
        this.publishAndSendRadio = page.locator('[data-test-publish-type="publish+send"]');
        this.sendOnlyRadio = page.locator('[data-test-publish-type="send"]');
        this.publishOnlyRadio = page.locator('[data-test-publish-type="publish"]');
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

    async clickPublishAndSendLabel(): Promise<void> {
        await this.page.locator('label[for="publish-type-publish+send"]').click();
    }

    async schedule(options: {date?: string; time?: string} = {}): Promise<void> {
        await this.publishAtButton.click();
        await this.scheduleRadio.click();
        await this.publishAtTitle.waitFor({state: 'visible'});

        if (options.date) {
            const textBefore = await this.publishAtTitle.textContent();
            await this.scheduleDateInput.fill(options.date);
            await this.scheduleDateInput.blur();
            if (textBefore) {
                await this.page.waitForFunction(
                    ({selector, oldText}) => {
                        const el = document.querySelector(selector);
                        return el && el.textContent?.trim() !== oldText.trim();
                    },
                    {selector: '[data-test-setting="publish-at"] [data-test-setting-title]', oldText: textBefore}
                );
            }
        }

        if (options.time) {
            await this.scheduleTimeInput.fill(options.time);
            await this.scheduleTimeInput.blur();
        }
    }

    async confirm(): Promise<void> {
        await this.continueButton.click();
        await this.confirmButton.click({force: true});

        try {
            await this.confirmButton.waitFor({state: 'hidden', timeout: 15000});
        } catch {
            // Publish may have failed due to transient server errors — retry once
            const confirmError = this.page.locator('[data-test-confirm-error]');
            if (await confirmError.isVisible()) {
                await this.confirmButton.click({force: true});
                await this.confirmButton.waitFor({state: 'hidden'});
            }
        }
    }

    async openPublishedPostBookmark(): Promise<Page> {
        const [frontendPage] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.bookmarkLink.click()
        ]);
        return frontendPage;
    }
}

class UpdateFlow extends BasePage {
    readonly updateButton: Locator;
    readonly revertToDraftButton: Locator;
    readonly saveButton: Locator;

    constructor(page: Page) {
        super(page);

        this.updateButton = page.locator('[data-test-button="update-flow"]').first();
        this.revertToDraftButton = page.locator('[data-test-button="revert-to-draft"]');
        this.saveButton = page.locator('[data-test-button="publish-save"]').first();
    }

    async revertToDraft(): Promise<void> {
        await this.updateButton.click();
        await this.revertToDraftButton.click();
    }

    async save(): Promise<void> {
        await this.saveButton.click();
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly editor: Locator;
    readonly secondaryEditor: Locator;
    readonly postStatus: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;
    readonly publishFlow: PublishFlow;
    readonly updateFlow: UpdateFlow;
    readonly screenTitle: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.editor = page.locator('[data-kg="editor"]').first();
        this.secondaryEditor = page.locator('[data-secondary-instance="true"]');
        this.postStatus = page.locator('[data-test-editor-post-status]').first();
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
        this.publishFlow = new PublishFlow(page);
        this.updateFlow = new UpdateFlow(page);
        this.screenTitle = page.locator('[data-test-screen-title]');

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createDraft(options: {title: string; body?: string}): Promise<void> {
        await this.titleInput.fill(options.title);
        if (options.body) {
            await this.editor.waitFor({state: 'visible'});
            // Click the editor to move focus away from the title field.
            // The title auto-save only triggers on focus-out (blur), so
            // we must explicitly move focus before waiting for "Saved".
            await this.editor.click();
            // Wait for the title save to complete before typing body content,
            // otherwise the POST response overwrites local editor state
            await this.postStatus.filter({hasText: 'Saved'}).waitFor({state: 'visible'});
            await this.page.keyboard.type(options.body);
        }
    }

    async openSettingsMenu(): Promise<void> {
        await this.settingsToggleButton.click();
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }
}
