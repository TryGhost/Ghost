import {AdminPage} from './admin-page';
import {Locator, Page} from '@playwright/test';
import {AnalyticsOverviewPage} from '@/admin-pages';

export class SignupPage extends AdminPage {
    readonly nameField: Locator;
    readonly emailField: Locator;
    readonly passwordField: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signup'; // Base URL, token will be appended

        this.nameField = page.locator('[data-test-input="name"]');
        this.emailField = page.locator('[data-test-input="email"]');
        this.passwordField = page.locator('[data-test-input="password"]');
        this.submitButton = page.locator('[data-test-button="signup"]');
    }

    /**
     * Navigate to signup page with invitation token
     * @param token - Base64 encoded invitation token
     */
    async gotoWithToken(token: string): Promise<void> {
        await this.page.goto(`${this.pageUrl}/${token}/`);
        await this.nameField.waitFor({state: 'visible'});
    }

    /**
     * Complete the signup form and submit
     * @param name - Full name for the user
     * @param password - Password for the user (email is pre-filled from token)
     */
    async completeSignup(name: string, password: string): Promise<void> {
        // Fill name field
        await this.nameField.fill(name);

        // Fill password field
        await this.passwordField.fill(password);

        // Submit the form
        await this.submitButton.click();

        // Wait for signup completion - should redirect to admin dashboard
        const analyticsPage = new AnalyticsOverviewPage(this.page);
        await analyticsPage.header.waitFor({state: 'visible'});
    }
}


