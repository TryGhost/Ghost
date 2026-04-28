import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class AccessSection extends BasePage {
    readonly section: Locator;
    readonly saveButton: Locator;
    readonly visibilitySelect: Locator;
    readonly passwordInput: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('access');
        this.saveButton = this.section.getByRole('button', {name: 'Save'});
        this.visibilitySelect = this.section.getByTestId('site-visibility-select');
        this.passwordInput = this.section.getByTestId('site-access-code');
    }

    async enablePrivateMode(password: string): Promise<void> {
        await this.selectVisibility('Private');
        await this.passwordInput.fill(password);
        await this.saveButton.click();
    }

    async disablePrivateMode(): Promise<void> {
        await this.selectVisibility('Public');
        await this.saveButton.click();
    }

    private async selectVisibility(label: 'Public' | 'Private'): Promise<void> {
        await this.visibilitySelect.click();
        const option = this.section.getByTestId('select-option').filter({hasText: new RegExp(`^${label}$`)});
        await option.waitFor({state: 'visible'});
        await option.click();
    }
}
