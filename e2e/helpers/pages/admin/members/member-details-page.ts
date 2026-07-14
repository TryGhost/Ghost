import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

const menuAction = (page: Page, name: string) => page.getByRole('button', {name});

class SettingsSection extends BasePage {
    readonly memberActionsButton: Locator;

    readonly impersonateButton: Locator;
    readonly signOutOfAllDevices: Locator;
    readonly disableCommentingButton: Locator;
    readonly enableCommentingButton: Locator;
    readonly deleteButton: Locator;
    readonly confirmDeleteButton: Locator;
    readonly cancelDeleteButton: Locator;

    constructor(page: Page) {
        super(page);
        this.memberActionsButton = page.getByTestId('member-actions');

        this.impersonateButton = menuAction(page, 'Impersonate');
        this.signOutOfAllDevices = menuAction(page, 'Sign out of all devices');
        this.disableCommentingButton = menuAction(page, 'Disable commenting');
        this.enableCommentingButton = menuAction(page, 'Enable commenting');

        this.deleteButton = menuAction(page, 'Delete member');
        this.confirmDeleteButton = page.getByTestId('confirm-delete-member');
        this.cancelDeleteButton = page.getByTestId('cancel-delete-member');
    }
}

export class MemberDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly noteInput: Locator;
    readonly labelsInput: Locator;
    readonly labels: Locator;
    readonly newsletterSubscriptionToggles: Locator;

    readonly saveButton: Locator;
    readonly savedButton: Locator;
    readonly retryButton: Locator;
    readonly membersBackLink: Locator;

    readonly copyLinkButton: Locator;
    readonly magicLinkInput: Locator;

    readonly confirmLeaveButton: Locator;
    readonly settingsSection: SettingsSection;

    readonly activityHeading: Locator;

    readonly disableCommentingModal: Locator;
    readonly disableCommentingConfirmButton: Locator;
    readonly disableCommentingCancelButton: Locator;
    readonly hideCommentsCheckbox: Locator;
    readonly commentingDisabledIndicator: Locator;
    readonly enableCommentingLink: Locator;

    readonly screenTitle: Locator;
    readonly logoutConfirmModal: Locator;
    readonly newsletterSubscriptionCheckboxes: Locator;
    readonly engagementSection: Locator;
    readonly subscriptionActionsButton: Locator;
    readonly cancelSubscriptionButton: Locator;
    readonly continueSubscriptionButton: Locator;
    readonly removeComplimentaryButton: Locator;
    readonly addComplimentaryButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});
        this.noteInput = page.getByRole('textbox', {name: 'Note'});
        this.labelsInput = page.getByText('Labels').locator('+ div');
        this.labels = this.labelsInput.getByRole('listitem');
        this.newsletterSubscriptionToggles = page.getByTestId('member-subscription-toggle');

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.savedButton = page.getByRole('button', {name: 'Saved'});
        this.retryButton = page.getByRole('button', {name: 'Retry'});
        this.membersBackLink = page.locator('[data-test-link="members-back"]');
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        // The testid resolves to two elements once the modal is open; the
        // input carrying the value is the last of them.
        this.magicLinkInput = page.getByTestId('member-signin-url').last();
        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});
        this.settingsSection = new SettingsSection(page);

        this.activityHeading = page.getByRole('heading', {name: 'Activity', level: 4});

        this.disableCommentingModal = page.getByRole('dialog');
        this.disableCommentingConfirmButton = this.disableCommentingModal.getByRole('button', {name: 'Disable commenting'});
        this.disableCommentingCancelButton = this.disableCommentingModal.getByRole('button', {name: 'Cancel'});
        this.hideCommentsCheckbox = this.disableCommentingModal.getByText('Hide all previous comments');
        this.commentingDisabledIndicator = page.getByText('Comments disabled');
        this.enableCommentingLink = page.getByRole('button', {name: 'Enable', exact: true});

        this.screenTitle = page.locator('[data-test-screen-title]');
        this.logoutConfirmModal = page.locator('[data-test-modal="logout-member"]');
        // The testid marks the styled toggle span, which sits next to the real
        // checkbox — the checked state has to be read from the input.
        this.newsletterSubscriptionCheckboxes = this.newsletterSubscriptionToggles
            .locator('..')
            .getByRole('checkbox');
        this.engagementSection = page.getByTestId('member-detail-engagement');

        this.subscriptionActionsButton = page.locator('[data-test-button="subscription-actions"]');
        this.cancelSubscriptionButton = menuAction(page, 'Cancel subscription');
        this.continueSubscriptionButton = menuAction(page, 'Continue subscription');
        this.removeComplimentaryButton = menuAction(page, 'Remove complimentary subscription');
        this.addComplimentaryButton = menuAction(page, 'Add complimentary subscription');
    }

    /**
     * Removes a complimentary subscription from the first subscription row.
     */
    async removeComplimentarySubscription(): Promise<void> {
        await this.subscriptionActionsButton.first().click();
        await this.removeComplimentaryButton.click();
        const confirm = this.page.getByRole('button', {name: 'Remove', exact: true});
        if (await confirm.isVisible().catch(() => false)) {
            await confirm.click();
        }
    }

    async clickNewsletterSubscriptionToggle(index: number = 0) {
        await this.newsletterSubscriptionToggles.nth(index).click();
    }

    async fillMemberDetails(name: string, email: string, note: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.noteInput.fill(note);
    }

    async labelNames() {
        return await this.labels.allInnerTexts();
    }

    async addLabel(label: string): Promise<void> {
        await this.labelsInput.click();
        await this.page.keyboard.type(label);
        await this.page.keyboard.press('Tab');
    }

    async removeLabel(labelName: string): Promise<void> {
        await this.labelsInput.click();
        await this.labels.filter({hasText: labelName}).getByLabel('remove element').click();
    }

    async removeLabels() {
        await this.labelsInput.click();
        let labelsCount = await this.labels.count();

        while (labelsCount > 0) {
            await this.labels.last().getByLabel('remove element').click();
            labelsCount = await this.labels.count();
        }
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.savedButton.waitFor({state: 'visible'});
    }

    getActivityEventByText(text: string | RegExp): Locator {
        return this.activityHeading.locator('..').getByText(text);
    }
}
