import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class MembersPage extends AdminPage {
    private readonly membersTable: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.membersTable = page.getByRole('table');
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.membersTable.getByRole('row').filter({hasText: email}).click();
    }
}
