import {Page} from '@playwright/test';
import {AdminPage} from './AdminPage';

export class AnalyticsPage extends AdminPage {
    constructor(page: Page) {
        super(page, '/ghost/#/analytics');
    }
}