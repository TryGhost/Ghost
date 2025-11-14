import {BasePage} from '../base-page';
import {Page} from '@playwright/test';

export class AdminPage extends BasePage {
    constructor(page: Page) {
        super(page, '/ghost');
    }
}
