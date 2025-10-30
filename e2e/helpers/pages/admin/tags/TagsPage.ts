import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class TagsPage extends AdminPage {
    readonly pageContent: Locator;

    readonly tagList: Locator;
    readonly tagListRow: Locator;
    readonly tagNames: Locator;

    readonly tabs: Locator;
    readonly activeTab: Locator;
    readonly newTagButton: Locator;
    readonly createNewTagButton: Locator;

    readonly loadingPlaceholder: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';
        this.pageContent = page.getByTestId('tags-page');
        this.tagList = page.getByTestId('tags-list');
        this.tagListRow = this.tagList.getByTestId('tag-list-row');
        this.tagNames = page.locator('[data-test-tag-name]');

        this.tabs = page.getByTestId('tags-header-tabs');
        this.activeTab = this.tabs.locator('[data-state="on"]');
        this.newTagButton = page.getByRole('link', {name: 'New tag'});
        this.createNewTagButton = this.pageContent.getByRole('link', {name: 'Create a new tag'});

        this.loadingPlaceholder = page.getByTestId('loading-placeholder');
    }

    title(name: string) {
        return this.pageContent.getByRole('heading', {name: name});
    }

    async selectTab(tabText: string) {
        const tab = this.tabs.getByLabel(tabText);
        await tab.click();
    }

    getRowByTitle(title: string) {
        return this.tagListRow.filter({has: this.page.getByRole('link', {name: title, exact: true})});
    }

    getTagLinkByName(name: string) {
        return this.getRowByTitle(name);
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.pageContent.waitFor({state: 'visible'});
    }
}
