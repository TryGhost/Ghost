import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class DangerZoneSection extends BasePage {
    readonly section: Locator;
    readonly heading: Locator;

    readonly deleteAllContentButton: Locator;
    readonly resetAuthButton: Locator;

    readonly confirmationModal: Locator;
    readonly deleteAllContentOkButton: Locator;
    readonly resetAuthOkButton: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/advanced');

        this.section = page.getByTestId('dangerzone');
        this.heading = page.getByRole('heading', {level: 5, name: 'Danger zone'});

        this.deleteAllContentButton = this.section.getByRole('button', {name: 'Delete all content'});
        this.resetAuthButton = this.section.getByRole('button', {name: 'Reset all authentication'});

        this.confirmationModal = page.getByTestId('confirmation-modal');
        this.deleteAllContentOkButton = this.confirmationModal.getByRole('button', {name: 'Delete', exact: true});
        this.resetAuthOkButton = this.confirmationModal.getByRole('button', {name: 'Reset all authentication'});
    }

    async openDeleteAllContentModal() {
        await this.deleteAllContentButton.click();
        await this.confirmationModal.waitFor({state: 'visible'});
    }

    async openResetAuthModal() {
        await this.resetAuthButton.click();
        await this.confirmationModal.waitFor({state: 'visible'});
    }
}
