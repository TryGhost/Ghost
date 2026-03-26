import {Locator, Page} from '@playwright/test';
import {PostEditorPage} from './post-editor-page';

export class PageEditorPage extends PostEditorPage {
    readonly newPageButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/page/';
        this.newPageButton = page.locator('[data-test-new-page-button]');
    }

    async gotoNewPage(): Promise<void> {
        await this.page.goto('/ghost/#/pages');
        await this.newPageButton.click();
        await this.titleInput.waitFor({state: 'visible'});
    }
}
