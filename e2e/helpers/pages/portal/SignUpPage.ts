import {Page, Locator, FrameLocator} from '@playwright/test';

export class SignUpPage {
    private readonly page: Page;
    private readonly portalFrame: FrameLocator;
    
    readonly emailInput: Locator;
    readonly nameInput: Locator;
    readonly signupButton: Locator;
    readonly signinLink: Locator;
    
    constructor(page: Page) {
        this.page = page;
        this.portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
        
        // Use role-based selectors for better reliability
        this.nameInput = this.portalFrame.getByRole('textbox', {name: 'Name'});
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.signupButton = this.portalFrame.getByRole('button', {name: 'Sign up'});
        this.signinLink = this.portalFrame.getByRole('button', {name: 'Sign in'});
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

    async fillName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    async submit(): Promise<void> {
        await this.signupButton.click();
    }

    async fillAndSubmit(email: string, name?: string): Promise<void> {
        if (name) {
            await this.fillName(name);
        }
        await this.fillEmail(email);
        await this.submit();
    }
}