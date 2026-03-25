import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalOfferPage extends PortalPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly submitButton: Locator;
    readonly continueButton: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = this.portalFrame.getByRole('textbox', {name: 'Name'});
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.submitButton = this.portalFrame.getByRole('button', {name: /Continue|Start .* free trial|Retry/});
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
    }

    headingWithText(text: string): Locator {
        return this.portalFrame.getByRole('heading', {name: text});
    }

    text(text: string | RegExp): Locator {
        return this.portalFrame.getByText(text);
    }

    async fillAndSubmit(email: string, name?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }

        await this.emailInput.fill(email);
        await this.submitButton.click();
    }

    async continueIfVisible(): Promise<void> {
        if (await this.continueButton.isVisible()) {
            await this.continueButton.click();
        }
    }

    async waitForOfferPage(title?: string): Promise<void> {
        await this.waitForPortalToOpen();
        await this.emailInput.waitFor({state: 'visible'});

        if (title) {
            await this.headingWithText(title).waitFor({state: 'visible'});
        }
    }
}
