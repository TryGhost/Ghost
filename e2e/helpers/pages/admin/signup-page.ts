import {AdminPage} from './admin-page';
import {Locator, Page} from '@playwright/test';

export class SignupPage extends AdminPage {
    readonly nameField: Locator;
    readonly emailField: Locator;
    readonly passwordField: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signup';

        this.nameField = page.locator('[data-test-input="name"]');
        this.emailField = page.locator('[data-test-input="email"]');
        this.passwordField = page.locator('[data-test-input="password"]');
        this.submitButton = page.locator('[data-test-button="signup"]');
    }

    async gotoWithToken(token: string): Promise<void> {
        await this.page.goto(`${this.pageUrl}/${token}/`);
        await this.nameField.waitFor({state: 'visible'});
    }

    async completeSignup(name: string, email: string, password: string): Promise<void> {
        await this.nameField.fill(name);

        if (await this.emailField.isVisible()) {
            const emailValue = await this.emailField.inputValue();
            if (!emailValue) {
                await this.emailField.fill(email);
            }
        }

        await this.passwordField.fill(password);
        await this.submitButton.click();
        await this.page.waitForURL(/\/ghost\/#\/(analytics|posts|site)/);
    }
}
