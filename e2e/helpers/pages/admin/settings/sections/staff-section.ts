import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class StaffSection extends BasePage {
    readonly requireTwoFaButton: Locator;
    readonly ownerUser: Locator;
    readonly invitePeopleButton: Locator;
    readonly inviteModal: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/staff');
        this.ownerUser = this.page.getByTestId('owner-user');
        this.requireTwoFaButton = page.getByTestId('users').getByRole('switch');
        this.invitePeopleButton = page.getByTestId('users').getByRole('button', {name: 'Invite people'});
        this.inviteModal = page.getByTestId('invite-user-modal');
    }

    async waitForOwnerUser(): Promise<void> {
        await this.ownerUser.waitFor({state: 'visible'});
    }

    async enableRequireTwoFa(): Promise<void> {
        await this.requireTwoFaButton.waitFor({state: 'visible'});
        await this.waitForOwnerUser();

        const isEnabled = await this.isRequireTwoFaEnabled();

        if (!isEnabled) {
            await this.requireTwoFaButton.click();
            await this.waitForSwitch(true);
        }
    }

    async disableRequireTwoFa(): Promise<void> {
        await this.requireTwoFaButton.waitFor({state: 'visible'});
        await this.waitForOwnerUser();
        const isEnabled = await this.isRequireTwoFaEnabled();

        if (isEnabled) {
            await this.requireTwoFaButton.click();
            await this.waitForSwitch(false);
        }
    }

    async isRequireTwoFaEnabled(): Promise<boolean> {
        const ariaChecked = await this.requireTwoFaButton.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    // Wait for the switch to be in {checked} state
    private async waitForSwitch(checked: boolean): Promise<void> {
        const switchState = this.page.getByTestId('users').getByRole('switch', {checked: checked});
        await switchState.waitFor({state: 'visible'});
    }

    /**
     * Invite a user via the admin UI
     * @param email - Email address of the user to invite
     * @param role - Role to assign: 'administrator' | 'editor' | 'author' | 'contributor'
     */
    async inviteUser(email: string, role: 'administrator' | 'editor' | 'author' | 'contributor'): Promise<void> {
        // Click "Invite people" button
        await this.invitePeopleButton.click();

        // Wait for modal to appear
        await this.inviteModal.waitFor({state: 'visible'});

        // Fill email field
        await this.inviteModal.getByLabel('Email address').fill(email);

        // Select role by clicking the radio button with matching value
        await this.inviteModal.locator(`button[value="${role}"]`).click();

        // Submit the invitation
        await this.inviteModal.getByRole('button', {name: 'Send invitation'}).click();

        // Wait for modal to close
        await this.inviteModal.waitFor({state: 'hidden'});
    }
}
