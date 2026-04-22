import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class AdminStaffDetailsPage extends BasePage {
    readonly userDetailModal: Locator;
    readonly emailInput: Locator;
    readonly slugInput: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/staff');

        this.userDetailModal = page.getByTestId('user-detail-modal');
        this.emailInput = this.userDetailModal.getByRole('textbox', {name: /Email/i});
        this.slugInput = this.userDetailModal.getByRole('textbox', {name: 'Slug'});
    }

    async gotoMyProfile() {
        return await super.goto('/ghost/#/my-profile');
    }
}
