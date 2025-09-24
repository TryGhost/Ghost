import {Page} from '@playwright/test';
import {AdminPage} from './admin-page';

export class MembersPage extends AdminPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';
    }
}
