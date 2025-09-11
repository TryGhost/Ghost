import {Page, Locator, FrameLocator} from '@playwright/test';

export class SignInPage {
    private readonly page: Page;
    private readonly portalFrame: FrameLocator;
    
    readonly emailInput: Locator;
    readonly continueButton: Locator;
    readonly signinButton: Locator;
    readonly signupLink: Locator;
    
    constructor(page: Page) {
        this.page = page;
        this.portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
        
        // Use role-based selectors for better reliability
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        // Initial button says "Continue" in signin flow
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        // After entering email, button changes to "Sign in"
        this.signinButton = this.portalFrame.getByRole('button', {name: 'Sign in'});
        this.signupLink = this.portalFrame.getByRole('button', {name: 'Sign up'});
    }

    async waitForFrame(): Promise<void> {
        await this.page.waitForSelector('[data-testid="portal-popup-frame"]', {
            state: 'visible',
            timeout: 5000
        });
        
        // Wait for the email input to be visible (indicates Portal content is loaded)
        await this.emailInput.waitFor({state: 'visible', timeout: 5000});
    }

    async fillEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    async clickContinue(): Promise<void> {
        await this.continueButton.click();
    }

    async submit(): Promise<void> {
        await this.signinButton.click();
    }
}