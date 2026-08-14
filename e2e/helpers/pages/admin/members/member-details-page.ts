import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

/**
 * Page object for the member detail screen.
 *
 * Menu entries are matched as either a menu item or a button, because the
 * screen renders both: subscription actions live in a Radix menu, while
 * "Add complimentary subscription" is a plain button in the subscriptions
 * section.
 */
const menuAction = (page: Page, name: string) => page.getByRole('menuitem', {name}).or(page.getByRole('button', {name}));

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
        this.memberActionsButton = page.getByTestId('member-actions').filter({visible: true});

        this.impersonateButton = menuAction(page, 'Impersonate');
        this.signOutOfAllDevices = menuAction(page, 'Sign out of all devices');
        this.disableCommentingButton = menuAction(page, 'Disable commenting');
        this.enableCommentingButton = menuAction(page, 'Enable commenting');

        this.deleteButton = menuAction(page, 'Delete member');
        this.confirmDeleteButton = page.getByTestId('confirm-delete-member').filter({visible: true});
        this.cancelDeleteButton = page.getByTestId('cancel-delete-member').filter({visible: true});
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
    readonly membersBackLink: Locator;

    readonly copyLinkButton: Locator;
    readonly magicLinkInput: Locator;

    readonly confirmLeaveButton: Locator;
    readonly settingsSection: SettingsSection;

    readonly activityFeed: Locator;

    readonly disableCommentingModal: Locator;
    readonly disableCommentingConfirmButton: Locator;
    readonly disableCommentingCancelButton: Locator;
    readonly hideCommentsCheckbox: Locator;
    readonly commentingDisabledIndicator: Locator;

    readonly screenTitle: Locator;
    readonly logoutConfirmModal: Locator;

    // Custom fields (React screen only, behind the membersCustomFields flag).
    readonly customFieldsCard: Locator;
    readonly customFieldModal: Locator;
    readonly newsletterSubscriptionCheckboxes: Locator;
    readonly engagementSection: Locator;
    readonly subscriptionActionsButton: Locator;
    readonly compTierOptions: Locator;
    readonly cancelSubscriptionButton: Locator;
    readonly continueSubscriptionButton: Locator;
    readonly removeComplimentaryButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});
        this.noteInput = page.getByRole('textbox', {name: 'Note'});
        this.labelsInput = page.getByText('Labels').locator('+ div');
        this.labels = this.labelsInput.getByRole('listitem');
        this.newsletterSubscriptionToggles = page.getByTestId('member-subscription-toggle').filter({visible: true});

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.savedButton = page.getByRole('button', {name: 'Saved'});
        this.membersBackLink = page.locator('[data-test-link="members-back"]').filter({visible: true});
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        this.magicLinkInput = page.getByTestId('member-signin-url').filter({visible: true});
        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});
        this.settingsSection = new SettingsSection(page);

        this.activityFeed = page.getByRole('region', {name: 'Activity'});

        this.disableCommentingModal = page.getByRole('dialog');
        this.disableCommentingConfirmButton = this.disableCommentingModal.getByRole('button', {name: 'Disable commenting'});
        this.disableCommentingCancelButton = this.disableCommentingModal.getByRole('button', {name: 'Cancel'});
        this.hideCommentsCheckbox = this.disableCommentingModal.getByRole('switch', {name: 'Hide all previous comments'});
        this.commentingDisabledIndicator = page.getByText('Comments disabled');

        this.screenTitle = page.getByTestId('member-detail-title');
        this.logoutConfirmModal = page.getByRole('alertdialog', {name: 'Sign out member from all devices?'});
        // The testid sits on the Radix switch, which carries the checked state
        // itself.
        this.newsletterSubscriptionCheckboxes = this.newsletterSubscriptionToggles.and(page.getByRole('switch'));
        this.engagementSection = page.getByTestId('member-detail-engagement').filter({visible: true});

        this.subscriptionActionsButton = page.getByRole('button', {name: 'Subscription menu'});
        this.cancelSubscriptionButton = menuAction(page, 'Cancel subscription');
        this.continueSubscriptionButton = menuAction(page, 'Continue subscription');
        this.removeComplimentaryButton = menuAction(page, 'Remove complimentary subscription');
        this.compTierOptions = page.getByRole('option');

        this.customFieldsCard = page.getByTestId('member-custom-fields-field');
        this.customFieldModal = page.getByTestId('member-custom-field-edit-modal');
    }

    // The row's accessible name is "Edit {field}" (plus ": {value}" once set), so
    // a non-exact match finds the row whether or not it holds a value yet.
    customFieldEditButton(fieldName: string): Locator {
        return this.customFieldsCard.getByRole('button', {name: `Edit ${fieldName}`});
    }

    /**
     * Set a scalar (text) custom field's value through its own editor. Each
     * field saves on its own Save, outside the page draft; the modal closes on
     * success.
     */
    async setCustomFieldValue(fieldName: string, value: string): Promise<void> {
        await this.customFieldEditButton(fieldName).click();
        await this.customFieldModal.getByLabel(fieldName).fill(value);
        await this.customFieldModal.getByRole('button', {name: 'Save', exact: true}).click();
        await this.customFieldModal.waitFor({state: 'detached'});
    }

    /**
     * Removes a complimentary subscription from the first subscription row.
     * Removal always asks for confirmation first.
     */
    async removeComplimentarySubscription(): Promise<void> {
        await this.subscriptionActionsButton.first().click();
        await this.removeComplimentaryButton.click();
        await this.page.getByRole('button', {name: 'Remove', exact: true}).click();
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
        return this.activityFeed.getByText(text);
    }
}
