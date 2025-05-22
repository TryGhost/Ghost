import {type Page, type Locator, expect} from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    private readonly adminURL: string;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly signInButton: Locator;
    private defaultUsername?: string;
    private defaultPassword?: string;

    constructor(page: Page, adminURL: string, defaultUsername?: string, defaultPassword?: string) {
        this.page = page;
        this.adminURL = adminURL;
        this.emailInput = page.getByRole('textbox', {name: 'Email address'});
        this.passwordInput = page.getByRole('textbox', {name: 'Password'});
        this.signInButton = page.getByRole('button', {name: 'Sign in →'});
        this.defaultUsername = defaultUsername;
        this.defaultPassword = defaultPassword;
    }

    async goto() {
        await this.page.goto(this.adminURL);
        await expect(this.emailInput).toBeVisible({timeout: 10000});
    }

    async login(username?: string, password?: string) {
        const u = username ?? this.defaultUsername;
        const p = password ?? this.defaultPassword;

        if (!u) {
            throw new Error('Username for login is not defined (neither passed as argument nor set as default).');
        }

        await this.emailInput.fill(u);
        if (p) {
            await this.passwordInput.fill(p);
        }
        await this.signInButton.click();
    }
}
