import {AdminPage} from '@/admin-pages';
import {Page} from '@playwright/test';

export class PostAnalyticsWebTrafficPage extends AdminPage {
    constructor(page: Page) {
        super(page);
    }
}
