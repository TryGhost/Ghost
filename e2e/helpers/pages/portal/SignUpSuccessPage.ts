import {Page, Locator, FrameLocator} from '@playwright/test';

export class SignUpSuccessPage {
    private readonly page: Page;
    private readonly portalFrame: FrameLocator;
    
    readonly successIcon: Locator;
    readonly successTitle: Locator;
    readonly successMessage: Locator;
    readonly closeButton: Locator;
    
    constructor(page: Page) {
        this.page = page;
        this.portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
        
        // Success state elements
        this.successIcon = this.portalFrame.locator('img').first(); // The checkmark/success icon
        this.successTitle = this.portalFrame.getByRole('heading', {name: 'Now check your email!'});
        this.successMessage = this.portalFrame.getByText('To complete signup, click the confirmation link in your inbox');
        this.closeButton = this.portalFrame.getByRole('button', {name: 'Close'});
    }

    async waitForSuccess(): Promise<void> {
        // Wait for the success title to appear
        await this.successTitle.waitFor({
            state: 'visible',
            timeout: 10000
        });
    }

    async isSuccessVisible(): Promise<boolean> {
        try {
            await this.successTitle.waitFor({
                state: 'visible',
                timeout: 1000
            });
            return true;
        } catch {
            return false;
        }
    }

    async getSuccessTitle(): Promise<string> {
        return await this.successTitle.textContent() || '';
    }

    async getSuccessMessage(): Promise<string> {
        return await this.successMessage.textContent() || '';
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        
        // Wait for Portal frame to disappear
        await this.page.waitForSelector('[data-testid="portal-popup-frame"]', {
            state: 'hidden',
            timeout: 5000
        });
    }

    async isPortalClosed(): Promise<boolean> {
        const frame = await this.page.$('[data-testid="portal-popup-frame"]');
        if (!frame) {
            return true;
        }
        return !(await frame.isVisible());
    }
}