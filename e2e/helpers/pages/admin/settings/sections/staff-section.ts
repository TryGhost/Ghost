import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class StaffSection extends BasePage {
    readonly requireTwoFaButton: Locator;
    readonly ownerUser: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/staff');
        this.ownerUser = this.page.getByTestId('owner-user');
        this.requireTwoFaButton = page.getByTestId('users').getByRole('switch');
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
}
