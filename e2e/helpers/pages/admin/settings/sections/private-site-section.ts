import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class PrivateSiteSection extends BasePage {
    readonly section: Locator;
    readonly editButton: Locator;
    readonly saveButton: Locator;
    readonly passwordToggle: Locator;
    readonly passwordInput: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('locksite');
        this.editButton = this.section.getByRole('button', {name: 'Edit'});
        this.saveButton = this.section.getByRole('button', {name: 'Save'});
        this.passwordToggle = this.section.getByLabel(/Enable password protection/);
        this.passwordInput = this.section.getByLabel('Site password');
    }

    async enablePrivateMode(password: string): Promise<void> {
        await this.editButton.click();
        await this.passwordToggle.check();
        await this.passwordInput.fill(password);
        await this.saveButton.click();
    }

    async disablePrivateMode(): Promise<void> {
        await this.editButton.click();
        await this.passwordToggle.uncheck();
        await this.saveButton.click();
    }
}
