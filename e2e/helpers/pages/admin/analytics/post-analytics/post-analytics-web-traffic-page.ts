import {Page} from '@playwright/test';
import {AdminPage} from '../../admin-page';

export class PostAnalyticsWebTrafficPage extends AdminPage {
    constructor(page: Page) {
        super(page);
    }
}
