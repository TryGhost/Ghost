import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class MemberDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly noteInput: Locator;
    readonly labelsInput: Locator;
    readonly subscriptionToggle: Locator;

    readonly memberActionsButton: Locator;
    readonly saveButton: Locator;
    readonly savedButton: Locator;
    readonly retryButton: Locator;

    readonly impersonateButton: Locator;
    readonly copyLinkButton: Locator;
    readonly magicLinkInput: Locator;

    readonly deleteButton: Locator;
    readonly confirmDeleteButton: Locator;
    readonly cancelDeleteButton: Locator;

    readonly confirmLeaveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});
        this.noteInput = page.getByRole('textbox', {name: 'Note'});
        this.labelsInput = page.getByText('Labels').locator('+ div');
        this.subscriptionToggle = page.getByTestId('member-subscription-toggle');

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.savedButton = page.getByRole('button', {name: 'Saved'});
        this.retryButton = page.getByRole('button', {name: 'Retry'});
        this.memberActionsButton = page.getByTestId('member-actions');
        this.deleteButton = page.getByRole('button', {name: 'Delete member'});
        this.impersonateButton = page.getByRole('button', {name: 'Impersonate'});
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        this.magicLinkInput = page.getByTestId('member-signin-url').last();

        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});

        this.confirmDeleteButton = page.getByTestId('confirm-delete-member');
        this.cancelDeleteButton = page.getByTestId('cancel-delete-member');
    }

    async fillMemberDetails(name: string, email: string, note: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.noteInput.fill(note);
    }

    async addLabel(label: string): Promise<void> {
        await this.labelsInput.click();
        await this.page.keyboard.type(label);
        await this.page.keyboard.press('Tab');
    }

    async removeLabel(): Promise<void> {
        await this.labelsInput.click();
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.press('Tab');
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.savedButton.waitFor({state: 'visible'});
    }
}
