import {Page} from '@playwright/test';
import {AdminPage} from '../../AdminPage';

export class PostAnalyticsWebTrafficPage extends AdminPage {
    constructor(page: Page) {
        super(page);
    }
}
