import {Page} from '@playwright/test';
import {BasePage} from '../BasePage';

export default class PublicPage extends BasePage{
    constructor(page: Page) {
        super(page, '/');
    }
}
