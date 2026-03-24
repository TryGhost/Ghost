import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class PrivateSitePage extends BasePage {
    readonly accessCodeLink: Locator;
    readonly accessCodeDialog: Locator;
    readonly enterButton: Locator;
    readonly siteBrand: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.accessCodeLink = page.getByRole('link', {name: 'Enter access code'});
        this.accessCodeDialog = page.getByRole('dialog', {name: 'Enter access code'});
        this.enterButton = page.getByRole('button', {name: /Enter/});
        this.siteBrand = page.locator('.gh-navigation-brand');
    }

    async openAccessCodeDialog(): Promise<void> {
        await this.accessCodeLink.click();
    }
}
