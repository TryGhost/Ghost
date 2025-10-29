import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class MemberDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;

    readonly saveButton: Locator;
    readonly deleteButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.deleteButton = page.getByRole('button', {name: 'Delete member'});
    }

    async updateName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    async updateEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }
}
