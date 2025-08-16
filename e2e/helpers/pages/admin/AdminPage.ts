import {BasePage} from '../BasePage';
import {Page} from '@playwright/test';

export class AdminPage extends BasePage {
    constructor(page: Page) {
        super(page, '/ghost');
    }
}
