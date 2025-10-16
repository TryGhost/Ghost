import {AdminPage} from './AdminPage';
import {Locator, Page} from '@playwright/test';

export class LoginPage extends AdminPage {
    readonly emailAddressField: Locator;
    readonly passwordField: Locator;
    readonly signInButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signin';

        this.emailAddressField = page.getByRole('textbox', {name: 'Email address'});
        this.passwordField = page.getByRole('textbox', {name: 'Password'});
        this.signInButton = page.getByRole('button', {name: 'Sign in →'});
    };

    async signIn(email: string, password: string) {
        await this.emailAddressField.waitFor({state: 'visible'});

        await this.emailAddressField.fill(email);
        await this.passwordField.fill(password);
        await this.signInButton.click();
    }

    async waitForLoginPageAfterUserCreated(): Promise<void> {
        await this.goto();
        await this.emailAddressField.waitFor({state: 'visible'});
    }
}
