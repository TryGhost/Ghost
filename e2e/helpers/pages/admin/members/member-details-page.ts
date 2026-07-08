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

    constructor(page: Page) {
        super(page);
        // The gear-icon trigger uses the same testid in both implementations
        // (Ember `member.hbs:44`, React `member-actions-menu.tsx`). Both
        // subtrees exist in the DOM when the flag is on (Ember shell is
        // `hidden`, React is visible), so `.filter({visible: true})` picks
        // the visible one instead of strict-mode-violating on two matches.
        this.memberActionsButton = page.getByTestId('member-actions').filter({visible: true});

        // Dropdown items: Ember renders plain <button>s; React (Radix)
        // renders role=menuitem inside a portal. The `.or()` union resolves
        // to whichever the DOM has visible at the time.
        this.impersonateButton = page.getByRole('menuitem', {name: 'Impersonate'}).or(page.getByRole('button', {name: 'Impersonate'}));
        this.signOutOfAllDevices = page.getByRole('menuitem', {name: 'Sign out of all devices'}).or(page.getByRole('button', {name: 'Sign out of all devices'}));
        this.disableCommentingButton = page.getByRole('menuitem', {name: 'Disable commenting'}).or(page.getByRole('button', {name: 'Disable commenting'}));
        this.enableCommentingButton = page.getByRole('menuitem', {name: 'Enable commenting'}).or(page.getByRole('button', {name: 'Enable commenting'}));

        this.deleteButton = page.getByRole('menuitem', {name: 'Delete member'}).or(page.getByRole('button', {name: 'Delete member'}));
        // `confirm-delete-member` / `cancel-delete-member` exist in both
        // (Ember `delete-member.hbs:39,49`, React `member-delete-modal.tsx`).
        // `getByTestId` doesn't filter to visible — do that explicitly to
        // avoid picking up a hidden dual-tree copy when the flag is on.
        this.confirmDeleteButton = page.getByTestId('confirm-delete-member').filter({visible: true});
        this.cancelDeleteButton = page.getByTestId('cancel-delete-member').filter({visible: true});
    }
}

/**
 * Page object for `/ghost/#/members/:member_id`.
 *
 * The route is dual-owned by the `memberDetailsReact` Labs flag: React and
 * Ember versions of the screen coexist and one is chosen at render time.
 * This page object works against BOTH implementations without branching.
 *
 * Key mechanism: when the flag is on, React renders and Ember's shell is
 * hidden via `[hidden]` on the wrapping div (`ember-root.tsx`). When off,
 * `MemberDetailGate` returns `<EmberFallback />` which is null, so no React
 * member-detail elements exist. In both cases only ONE tree has VISIBLE
 * member-detail elements — Playwright's `getByRole` and `getByLabel` skip
 * hidden ancestors by default, so plain page-level locators resolve
 * unambiguously without needing to scope to a React-only root.
 *
 * Locators that stay page-scoped:
 *   - Form controls (`name`, `email`, `note`) — visible-only role match.
 *   - Save / Saved / Retry buttons — same reasoning.
 *   - Members back link — attribute exists in both templates; only one is
 *     visible at a time.
 *   - Modal contents (Copy link, magic link, confirm/cancel dialogs) — Radix
 *     renders these in a portal outside any nested root, so page-wide is the
 *     only place they can be found.
 */
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

    // Cross-implementation title anchors, used by the parity file to assert
    // the member name renders in a specific title element (not just anywhere
    // on the page).
    readonly emberScreenTitle: Locator;
    readonly reactScreenTitle: Locator;
    // Subtree-scoped `member-actions` locators used by the parity file to
    // assert the sole-tree invariant: only one implementation renders the
    // detail elements at a time.
    readonly emberMemberActions: Locator;
    readonly reactMemberActions: Locator;
    // Cross-implementation logout-confirmation modal. Ember uses a plain
    // `<div>` with `data-test-modal="logout-member"`; React uses
    // `data-testid="logout-member-modal"` on Shade's AlertDialog. Scoping to
    // this locator prevents the "Sign out" click from bleeding into the
    // account-owner sidebar button.
    readonly logoutConfirmModal: Locator;

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
        this.retryButton = page.getByRole('button', {name: 'Retry'});
        // `data-test-link` is a CSS attribute selector — no visibility filter
        // is applied automatically. Both implementations render this attribute
        // when the flag is on, so pin to the visible one.
        this.membersBackLink = page.locator('[data-test-link="members-back"]').filter({visible: true});
        this.copyLinkButton = page.getByRole('button', {name: 'Copy link'});
        this.magicLinkInput = page.getByTestId('member-signin-url').filter({visible: true});
        this.confirmLeaveButton = page.getByRole('button', {name: 'Leave'});
        this.settingsSection = new SettingsSection(page);

        this.activityHeading = page.getByRole('heading', {name: 'Activity', level: 4});

        // Ember uses `data-test-modal="disable-commenting"`, React uses
        // `data-testid="disable-commenting-modal"`. The `.or()` union covers
        // both by falling back to the React testid via `getByTestId`.
        // `.filter({visible: true})` is consistent with the other dual-tree
        // locators in this class — the union could technically resolve to
        // two matches if both testids ever coexist under a broken abort.
        this.disableCommentingModal = page.getByTestId('disable-commenting-modal').or(page.locator('[data-test-modal="disable-commenting"]')).filter({visible: true});
        this.disableCommentingConfirmButton = this.disableCommentingModal.getByRole('button', {name: 'Disable commenting'});
        this.disableCommentingCancelButton = this.disableCommentingModal.getByRole('button', {name: 'Cancel'});
        this.hideCommentsCheckbox = this.disableCommentingModal.getByText('Hide all previous comments');
        this.commentingDisabledIndicator = page.getByText('Comments disabled');
        this.enableCommentingLink = page.getByRole('button', {name: 'Enable', exact: true});

        // Parity-file helpers — scope to the specific implementation's root
        // so tests can assert "only one tree renders detail elements" and
        // pin name assertions to the actual title element instead of any
        // matching text on the page.
        this.emberScreenTitle = page.locator('#ember-app [data-test-screen-title]');
        this.reactScreenTitle = page.getByTestId('member-detail-title');
        this.emberMemberActions = page.locator('#ember-app').getByTestId('member-actions');
        this.reactMemberActions = page.getByTestId('member-detail').getByTestId('member-actions');
        this.logoutConfirmModal = page.locator('[data-test-modal="logout-member"]')
            .or(page.getByTestId('logout-member-modal'));
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
