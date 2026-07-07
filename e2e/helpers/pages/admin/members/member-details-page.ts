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
        // The gear-icon trigger lives inside the React root — scope it there
        // so it doesn't ambiguously match any legacy admin element with the
        // same testid.
        this.memberActionsButton = root.getByTestId('member-actions');

        // DropdownMenuItem / DialogContent are rendered by Radix into PORTALS
        // at the document root — outside the `member-detail` scope. Search
        // them page-wide, but stay specific enough not to collide with Ember's
        // hidden shell:
        //   - menu items also fall back through `button` role because the
        //     legacy Ember admin rendered plain `<button>`s in its dropdown.
        this.impersonateButton = page.getByRole('menuitem', {name: 'Impersonate'}).or(page.getByRole('button', {name: 'Impersonate'}));
        this.signOutOfAllDevices = page.getByRole('menuitem', {name: 'Sign out of all devices'}).or(page.getByRole('button', {name: 'Sign out of all devices'}));
        this.disableCommentingButton = page.getByRole('menuitem', {name: 'Disable commenting'}).or(page.getByRole('button', {name: 'Disable commenting'}));
        this.enableCommentingButton = page.getByRole('menuitem', {name: 'Enable commenting'}).or(page.getByRole('button', {name: 'Enable commenting'}));

        this.deleteButton = page.getByRole('menuitem', {name: 'Delete member'}).or(page.getByRole('button', {name: 'Delete member'}));
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

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        // Post-Phase 8 cutover, the URL `/members/:id` renders React. Scope
        // *page-body* locators to the React root so Ember's hidden shell (which
        // shares `data-test-link="members-back"` and a few other test hooks)
        // can't ambiguously match. Anything rendered by Radix in a portal —
        // menu items, modal contents — has to be searched page-wide instead.
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

        // Dialog contents render in a portal — must be searched page-wide.
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        this.magicLinkInput = page.getByTestId('member-signin-url').last();
        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});
        this.settingsSection = new SettingsSection(page, root);

        this.activityHeading = root.getByRole('heading', {name: 'Activity', level: 4});

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
