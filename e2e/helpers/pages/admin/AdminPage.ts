import {BasePage} from '../BasePage';
import {Page} from '@playwright/test';

class AdminPage extends BasePage {
    constructor(page: Page) {
        super(page, '/ghost');
    }
}

export default AdminPage;
