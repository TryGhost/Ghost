import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class AutomationEditorPage extends AdminPage {
    readonly editor: Locator;
    readonly addTailStepButton: Locator;
    readonly stepPicker: Locator;
    readonly waitStep: Locator;
    readonly sendEmailStep: Locator;
    readonly stepSidebar: Locator;
    readonly editEmailContentButton: Locator;
    readonly emailContentModal: Locator;
    readonly emailEditor: Locator;
    readonly emailEditorSaveButton: Locator;
    readonly emailEditorSavedButton: Locator;
    readonly emailEditorCloseButton: Locator;
    readonly discardEmailChangesDialog: Locator;
    readonly discardEmailChangesButton: Locator;
    readonly discardAutomationChangesDialog: Locator;

    constructor(page: Page) {
        super(page);
        this.editor = page.getByTestId('automation-editor');
        this.addTailStepButton = page.getByTestId('add-step-tail-button');
        this.stepPicker = page.getByTestId('step-picker');
        this.waitStep = page.getByRole('button', {name: /^Wait:/});
        this.sendEmailStep = page.getByRole('button', {name: /^Send email:/});
        this.stepSidebar = page.getByRole('complementary', {name: 'Step details'});
        this.editEmailContentButton = this.stepSidebar.getByRole('button', {name: 'Edit email content'});
        this.emailContentModal = page.getByRole('dialog', {name: 'Edit email'});
        this.emailEditor = this.emailContentModal.getByTestId('email-editor').getByRole('textbox').first();
        this.emailEditorSaveButton = this.emailContentModal.getByRole('button', {name: 'Save'});
        this.emailEditorSavedButton = this.emailContentModal.getByRole('button', {name: 'Saved'});
        this.emailEditorCloseButton = this.emailContentModal.getByRole('button', {name: 'Close'});
        this.discardEmailChangesDialog = page.getByRole('alertdialog', {name: 'Discard changes?'});
        this.discardEmailChangesButton = this.discardEmailChangesDialog.getByRole('button', {name: 'Discard'});
        this.discardAutomationChangesDialog = page.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
    }

    async gotoAutomation(automationId: string): Promise<void> {
        await this.goto(`/ghost/#/automations/${automationId}`);
        await this.editor.waitFor({state: 'visible'});
    }

    async addWaitStepAtTail(): Promise<void> {
        await this.addTailStepButton.click();
        await this.stepPicker.getByRole('button', {name: 'Wait Wait a set amount of time'}).click();
        await this.waitStep.waitFor({state: 'visible'});
    }

    async addEmailStepAtTail(): Promise<void> {
        await this.addTailStepButton.click();
        await this.stepPicker.getByRole('button', {name: 'Email Send an email'}).click();
        await this.sendEmailStep.waitFor({state: 'visible'});
    }

    async openEmailContentEditor(): Promise<void> {
        await this.sendEmailStep.click();
        await this.editEmailContentButton.click();
        await this.emailContentModal.waitFor({state: 'visible'});
        await this.emailEditor.waitFor({state: 'visible'});
    }

    async replaceEmailBody(content: string): Promise<void> {
        await this.emailEditor.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Backspace');
        await this.emailEditor.type(content);
    }

    async updateSelectedEmailSubject(subject: string): Promise<void> {
        await this.stepSidebar.getByPlaceholder('Subject line').fill(subject);
    }

    async saveAndCloseEmailContentEditor(): Promise<void> {
        await this.emailEditorSaveButton.click();
        await this.emailEditorSavedButton.waitFor({state: 'visible'});
        await this.emailEditorCloseButton.click();
        await this.emailContentModal.waitFor({state: 'hidden'});
    }
}
