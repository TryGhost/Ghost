import {Page, Locator} from '@playwright/test';
import {PortalPage} from './PortalPage';

export class SignInPage extends PortalPage {
    readonly emailInput: Locator;
    readonly continueButton: Locator;
    readonly signinButton: Locator;
    readonly signupLink: Locator;

    constructor(page: Page) {
        super(page);

        // Use role-based selectors for better reliability
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        // Initial button says "Continue" in signin flow
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        // After entering email, button changes to "Sign in"
        this.signinButton = this.portalFrame.getByRole('button', {name: 'Sign in'});
        this.signupLink = this.portalFrame.getByRole('button', {name: 'Sign up'});
    }
}