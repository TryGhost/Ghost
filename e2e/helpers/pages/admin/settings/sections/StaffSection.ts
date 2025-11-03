import {BasePage} from '../../../BasePage';
import {Locator, Page} from '@playwright/test';

export class StaffSection extends BasePage {
    readonly requireTwoFaButton: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/staff');
        this.requireTwoFaButton = page.getByTestId('users').getByRole('switch');
    }

    async toggleRequireTwoFa(): Promise<void> {
        await this.requireTwoFaButton.click();
    }

    async enableRequireTwoFa(): Promise<void> {
        const isEnabled = await this.isRequireTwoFaEnabled();
        if (!isEnabled) {
            await this.requireTwoFaButton.click();
        }

        // Wait for the switch to be in checked state using Playwright locator
        const checkedSwitch = this.page.getByTestId('users').getByRole('switch', {checked: true});
        await checkedSwitch.waitFor({state: 'visible'});
    }

    async disableRequireTwoFa(): Promise<void> {
        const isEnabled = await this.isRequireTwoFaEnabled();

        if (isEnabled) {
            await this.requireTwoFaButton.click();
        }

        // Wait for the switch to be in unchecked state using Playwright locator
        const uncheckedSwitch = this.page.getByTestId('users').getByRole('switch', {checked: false});
        await uncheckedSwitch.waitFor({state: 'visible'});
    }

    async isRequireTwoFaEnabled(): Promise<boolean> {
        const ariaChecked = await this.requireTwoFaButton.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }
}
