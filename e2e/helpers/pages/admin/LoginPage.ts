import {Locator, Page, expect} from '@playwright/test';
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
        this.errorMessage = page.locator('[data-test-flow-notification], .main-error');
    }

    async fillAndSubmitLoginForm(email: string, password: string) {
        await this.identificationInput.fill(email);
        await this.passwordInput.fill(password);
        await this.signInButton.click();
        
        // Wait for either redirect (success) or error message (failure)
        await Promise.race([
            this.page.waitForURL(url => !url.toString().includes('/signin'), {timeout: 5000}).catch(() => {}),
            this.errorMessage.waitFor({state: 'visible', timeout: 5000}).catch(() => {}),
            this.page.waitForTimeout(2000) // Fallback timeout
        ]);
    }
    
    // Backwards compatibility - includes navigation
    async login(email: string, password: string) {
        await this.goto();
        await this.page.waitForLoadState('networkidle');
        await this.fillAndSubmitLoginForm(email, password);
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
    
    // Composable assertion methods
    async assertLoginSuccessful() {
        await expect(this.page).not.toHaveURL(/\/signin/);
        const isLoggedIn = await this.isLoginSuccessful();
        expect(isLoggedIn).toBe(true);
    }
    
    async assertLoginFailed() {
        await expect(this.page).toHaveURL(/\/signin/);
        const isLoggedIn = await this.isLoginSuccessful();
        expect(isLoggedIn).toBe(false);
    }
    
    async assertErrorMessage(expectedMessage?: string) {
        await expect(this.errorMessage).toBeVisible();
        if (expectedMessage) {
            await expect(this.errorMessage).toContainText(expectedMessage);
        }
    }
    
    async assertNoErrorMessage() {
        await expect(this.errorMessage).not.toBeVisible();
    }
    
    // Role-based login (without navigation)
    async loginAsOwner() {
        await this.fillAndSubmitLoginForm('test+admin@test.com', 'P4ssw0rd123$');
        await this.assertLoginSuccessful();
    }
    
    async loginAsAdmin() {
        await this.loginAsOwner(); // Same user, owner has admin privileges
    }
    
    // Failure scenarios (without navigation)
    async attemptLoginWithInvalidPassword() {
        await this.fillAndSubmitLoginForm('test+admin@test.com', 'wrongpassword');
        await this.assertLoginFailed();
        await this.assertErrorMessage();
    }
    
    async attemptLoginWithNonexistentUser() {
        await this.fillAndSubmitLoginForm('nonexistent@example.com', 'password');
        await this.assertLoginFailed();
        await this.assertErrorMessage();
    }
    
    // One-line login with assertion (includes navigation - for backwards compatibility)
    async loginAndAssertSuccess(email: string, password: string) {
        await this.login(email, password);
        await this.assertLoginSuccessful();
    }
    
    // Login expecting failure (includes navigation - for backwards compatibility)
    async loginAndAssertFailure(email: string, password: string, expectedError?: string) {
        await this.login(email, password);
        await this.assertLoginFailed();
        if (expectedError) {
            await this.assertErrorMessage(expectedError);
        } else {
            await this.assertErrorMessage();
        }
    }
}