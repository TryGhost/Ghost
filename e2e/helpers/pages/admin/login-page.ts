import {AdminPage} from './admin-page';
import {Locator, Page} from '@playwright/test';

export class LoginPage extends AdminPage {
    readonly emailAddressField: Locator;
    readonly passwordField: Locator;
    readonly signInButton: Locator;
    readonly forgotButton: Locator;
    readonly passwordResetSuccessMessage: Locator;

    private setupNewUserUrl = 'setup';

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signin';

        this.emailAddressField = page.getByRole('textbox', {name: 'Email address'});
        this.passwordField = page.getByRole('textbox', {name: 'Password'});
        this.signInButton = page.getByRole('button', {name: 'Sign in →'});
        this.forgotButton = page.getByRole('button', {name: 'Forgot?'});
        this.passwordResetSuccessMessage = page.getByRole('status');
    };

    async signIn(email: string, password: string) {
        await this.emailAddressField.waitFor({state: 'visible'});

        await this.emailAddressField.fill(email);
        await this.passwordField.fill(password);
        await this.signInButton.click();
    }

    async requestPasswordReset(email: string) {
        await this.emailAddressField.waitFor({state: 'visible'});
        await this.emailAddressField.fill(email);
        await this.forgotButton.click();
    }

    async logoutByCookieClear() {
        const context = await this.page.context();
        await context.clearCookies();
        await this.page.reload();
    }

    async waitForLoginPageAfterUserCreated(): Promise<void> {
        let counter = 0;

        while (counter < 5) {
            await this.goto();

            try {
                await this.page.waitForURL(
                    url => !url.href.includes(this.setupNewUserUrl),
                    {timeout: 1000}
                );

                break;
            } catch (error) {
                counter += 1;
                if (counter >= 5) {
                    throw error;
                }
            }
        }
    }
}
