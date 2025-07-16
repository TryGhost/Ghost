import {Locator, Page} from '@playwright/test';
import AdminPage from './AdminPage';

export class LoginPage extends AdminPage {
    readonly identificationInput: Locator;
    readonly passwordInput: Locator;
    readonly signInButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signin';
        this.identificationInput = page.locator('input[name="identification"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.signInButton = page.locator('[data-test-button="sign-in"]');
        this.errorMessage = page.locator('.error, .notification-error, [class*="error"]');
    }

    async login(email: string, password: string) {
        await this.goto();
        await this.page.waitForLoadState('networkidle');
        
        await this.identificationInput.fill(email);
        await this.passwordInput.fill(password);
        await this.signInButton.click();
        
        // Wait for login to complete - we expect to be redirected away from /signin
        await this.page.waitForURL(url => !url.toString().includes('/signin'), {timeout: 10000});
    }

    async getErrorMessage(): Promise<string | null> {
        try {
            return await this.errorMessage.textContent({timeout: 1000});
        } catch {
            return null;
        }
    }

    async isLoginSuccessful(): Promise<boolean> {
        const currentUrl = this.page.url();
        return !currentUrl.includes('/signin');
    }
}