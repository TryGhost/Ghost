import {AdminPage} from './AdminPage';
import {Locator, Page} from '@playwright/test';

export class TagsPage extends AdminPage {
    readonly tagNames: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/tags';
        this.tagNames = page.locator('[data-test-tag-name]');
    }

    getTagByName(name: string): Locator {
        return this.tagNames.filter({hasText: name});
    }
}
