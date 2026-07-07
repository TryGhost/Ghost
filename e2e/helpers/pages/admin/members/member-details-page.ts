import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

class SettingsSection extends BasePage {
    readonly memberActionsButton: Locator;

    readonly impersonateButton: Locator;
    readonly signOutOfAllDevices: Locator;
    readonly disableCommentingButton: Locator;
    readonly enableCommentingButton: Locator;
    readonly deleteButton: Locator;
    readonly confirmDeleteButton: Locator;
    readonly cancelDeleteButton: Locator;

    constructor(page: Page, root: Locator) {
        super(page);
        // Everything is scoped to the React member-detail root so we never
        // match Ember's still-mounted (but visually hidden) member view when
        // both routers claim the same URL post-cutover.
        this.memberActionsButton = root.getByTestId('member-actions');

        // Dropdown items are `menuitem`, not `button`, in the React version
        // (Radix DropdownMenu). The legacy Ember version rendered plain
        // `<button>`s inside the dropdown — the shared page object needs a
        // locator that resolves both so the legacy Playwright tests still
        // pass against the React screen.
        this.impersonateButton = root.getByRole('menuitem', {name: 'Impersonate'}).or(root.getByRole('button', {name: 'Impersonate'}));
        this.signOutOfAllDevices = root.getByRole('menuitem', {name: 'Sign out of all devices'}).or(root.getByRole('button', {name: 'Sign out of all devices'}));
        this.disableCommentingButton = root.getByRole('menuitem', {name: 'Disable commenting'}).or(root.getByRole('button', {name: 'Disable commenting'}));
        this.enableCommentingButton = root.getByRole('menuitem', {name: 'Enable commenting'}).or(root.getByRole('button', {name: 'Enable commenting'}));

        this.deleteButton = root.getByRole('menuitem', {name: 'Delete member'}).or(root.getByRole('button', {name: 'Delete member'}));
        this.confirmDeleteButton = root.getByTestId('confirm-delete-member');
        this.cancelDeleteButton = root.getByTestId('cancel-delete-member');
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

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        // Post-cutover, the URL `/members/:id` is served by React BUT Ember's
        // still-mounted member view also renders into a hidden `#ember-app`
        // container. Scope every locator to the React root so a duplicate
        // testid/role in the Ember DOM can't cause strict-mode ambiguity or
        // click the wrong element.
        const root = page.getByTestId('member-detail');

        this.nameInput = root.getByRole('textbox', {name: 'Name'});
        this.emailInput = root.getByRole('textbox', {name: 'Email'});
        this.noteInput = root.getByRole('textbox', {name: 'Note'});
        this.labelsInput = root.getByText('Labels').locator('+ div');
        this.labels = this.labelsInput.getByRole('listitem');
        this.newsletterSubscriptionToggles = root.getByTestId('member-subscription-toggle');

        this.saveButton = root.getByRole('button', {name: 'Save'});
        this.savedButton = root.getByRole('button', {name: 'Saved'});
        this.retryButton = root.getByRole('button', {name: 'Retry'});
        this.membersBackLink = root.locator('[data-test-link="members-back"]');
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        this.magicLinkInput = page.getByTestId('member-signin-url').last();
        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});
        this.settingsSection = new SettingsSection(page, root);

        this.activityHeading = root.getByRole('heading', {name: 'Activity', level: 4});

        // Modals render in a portal outside the DetailPage root, so scope them
        // by role rather than the React root.
        this.disableCommentingModal = page.getByTestId('disable-commenting-modal');
        this.disableCommentingConfirmButton = this.disableCommentingModal.getByRole('button', {name: 'Disable commenting'});
        this.disableCommentingCancelButton = this.disableCommentingModal.getByRole('button', {name: 'Cancel'});
        this.hideCommentsCheckbox = this.disableCommentingModal.getByText('Hide all previous comments');
        this.commentingDisabledIndicator = root.getByText('Comments disabled');
        this.enableCommentingLink = root.getByRole('button', {name: 'Enable', exact: true});
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
