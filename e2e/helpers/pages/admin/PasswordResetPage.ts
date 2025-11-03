import {AdminPage} from './AdminPage';
import {Locator, Page} from '@playwright/test';

export class PasswordResetPage extends AdminPage {
    readonly pageHeading: Locator;
    readonly newPasswordField: Locator;
    readonly confirmPasswordField: Locator;
    readonly saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/reset';

        this.pageHeading = page.getByRole('heading', {name: 'Reset your password.'});
        this.newPasswordField = page.getByRole('textbox', {name: 'New password', exact: true});
        this.confirmPasswordField = page.getByRole('textbox', {name: 'Confirm new password', exact: true});
        this.saveButton = page.getByRole('button', {name: 'Save new password'});
    }

    async resetPassword(newPassword: string, confirmPassword: string) {
        await this.newPasswordField.waitFor({state: 'visible'});
        await this.newPasswordField.fill(newPassword);
        await this.confirmPasswordField.fill(confirmPassword);
        await this.saveButton.click();
    }
}
